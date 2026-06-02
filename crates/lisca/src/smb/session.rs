use std::{
    collections::HashMap,
    sync::{Arc, OnceLock},
    time::Duration,
};

use smb2::client::{ClientConfig, SmbClient};
use smb2::msg::close::CloseRequest;
use smb2::msg::read::{ReadRequest, ReadResponse, SMB2_CHANNEL_NONE};
use smb2::pack::{ReadCursor, Unpack};
use smb2::types::status::NtStatus;
use smb2::types::{Command, FileId};
use smb2::Tree;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::protocol::{HostFsEntry, HostListDirectoryResult, SmbConnectResponse};

use super::{
    path::{format_smb_path, parse_smb_path},
    runtime::block_on,
    url::parse_smb_url,
};

pub(crate) struct SmbSession {
    pub(crate) client: SmbClient,
    pub(crate) tree: Tree,
}

struct SmbSessionStore {
    sessions: HashMap<String, SmbSession>,
}

impl SmbSessionStore {
    fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
}

fn store() -> &'static Arc<Mutex<SmbSessionStore>> {
    static STORE: OnceLock<Arc<Mutex<SmbSessionStore>>> = OnceLock::new();
    STORE.get_or_init(|| Arc::new(Mutex::new(SmbSessionStore::new())))
}

fn split_credentials(username: &str) -> (String, String) {
    if let Some((domain, user)) = username.split_once('\\') {
        return (domain.to_string(), user.to_string());
    }
    if let Some((user, domain)) = username.split_once('@') {
        return (domain.to_string(), user.to_string());
    }
    (String::new(), username.to_string())
}

pub async fn connect_async(
    url: &str,
    username: &str,
    password: &str,
) -> Result<SmbConnectResponse, String> {
    let parsed = parse_smb_url(url)?;
    let (domain, user) = split_credentials(username);
    let addr = format!("{}:445", parsed.host);

    let config = ClientConfig {
        addr,
        timeout: Duration::from_secs(60),
        username: user,
        password: password.to_string(),
        domain,
        auto_reconnect: true,
        compression: false,
        dfs_enabled: true,
        dfs_target_overrides: HashMap::new(),
    };

    let mut client = SmbClient::connect(config)
        .await
        .map_err(|error| format!("SMB connect failed: {error}"))?;
    let tree = client
        .connect_share(&parsed.share)
        .await
        .map_err(|error| format!("SMB share connect failed: {error}"))?;

    let session_id = Uuid::new_v4().to_string();
    let root_path = format_smb_path(&session_id, &parsed.share_relative_path);

    store()
        .lock()
        .await
        .sessions
        .insert(session_id.clone(), SmbSession { client, tree });

    Ok(SmbConnectResponse {
        session_id,
        root_path,
    })
}

pub fn connect(url: &str, username: &str, password: &str) -> Result<SmbConnectResponse, String> {
    block_on(connect_async(url, username, password))
}

pub async fn disconnect_async(session_id: &str) -> Result<(), String> {
    let mut guard = store().lock().await;
    let Some(mut session) = guard.sessions.remove(session_id) else {
        return Ok(());
    };
    let _ = session.client.disconnect_share(&session.tree).await;
    Ok(())
}

pub fn disconnect(session_id: &str) -> Result<(), String> {
    block_on(disconnect_async(session_id))
}

fn parent_relative_path(relative_path: &str) -> Option<String> {
    let trimmed = relative_path.trim_end_matches('/');
    if trimmed.is_empty() {
        return None;
    }
    let parent = trimmed
        .rsplit_once('/')
        .map(|(parent, _)| parent.to_string())
        .unwrap_or_default();
    Some(parent)
}

pub async fn list_directory_async(
    path: &str,
) -> Result<HostListDirectoryResult, String> {
    let parsed = parse_smb_path(path)?;
    let mut guard = store().lock().await;
    let session = guard
        .sessions
        .get_mut(&parsed.session_id)
        .ok_or_else(|| format!("SMB session not found: {}", parsed.session_id))?;

    let list_path = parsed.relative_path.as_str();
    let entries = session
        .client
        .list_directory(&mut session.tree, list_path)
        .await
        .map_err(|error| format!("SMB list failed: {error}"))?;

    let mut host_entries = Vec::new();
    for entry in entries {
        if entry.name == "." || entry.name == ".." {
            continue;
        }
        let child_relative = if list_path.is_empty() {
            entry.name.clone()
        } else {
            format!("{list_path}/{}", entry.name)
        };
        host_entries.push(HostFsEntry {
            name: entry.name,
            path: format_smb_path(&parsed.session_id, &child_relative),
            is_directory: entry.is_directory,
        });
    }

    host_entries.sort_by(|left, right| {
        right
            .is_directory
            .cmp(&left.is_directory)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    let parent = parent_relative_path(&parsed.relative_path)
        .map(|parent| format_smb_path(&parsed.session_id, &parent));

    Ok(HostListDirectoryResult {
        path: Some(path.to_string()),
        parent,
        entries: host_entries,
    })
}

pub fn list_directory(path: &str) -> Result<HostListDirectoryResult, String> {
    block_on(list_directory_async(path))
}

pub async fn read_bytes_async(path: &str) -> Result<Vec<u8>, String> {
    let parsed = parse_smb_path(path)?;
    let mut guard = store().lock().await;
    let session = guard
        .sessions
        .get_mut(&parsed.session_id)
        .ok_or_else(|| format!("SMB session not found: {}", parsed.session_id))?;

    session
        .client
        .read_file_pipelined(&mut session.tree, &parsed.relative_path)
        .await
        .map_err(|error| format!("SMB read failed: {error}"))
}

pub fn read_bytes(path: &str) -> Result<Vec<u8>, String> {
    block_on(read_bytes_async(path))
}

pub async fn stat_file_async(session_id: &str, relative_path: &str) -> Result<u64, String> {
    let mut guard = store().lock().await;
    let session = guard
        .sessions
        .get_mut(session_id)
        .ok_or_else(|| format!("SMB session not found: {session_id}"))?;
    let info = session
        .client
        .stat(&mut session.tree, relative_path)
        .await
        .map_err(|error| format!("SMB stat failed: {error}"))?;
    Ok(info.size)
}

pub(crate) async fn open_smb_file_async(
    session_id: &str,
    relative_path: &str,
) -> Result<(FileId, u64), String> {
    let mut guard = store().lock().await;
    let session = guard
        .sessions
        .get_mut(session_id)
        .ok_or_else(|| format!("SMB session not found: {session_id}"))?;
    let conn = session.client.connection_mut();
    session
        .tree
        .open_file(conn, relative_path)
        .await
        .map_err(|error| format!("SMB open file failed: {error}"))
}

pub(crate) async fn read_smb_file_at_async(
    session_id: &str,
    file_id: FileId,
    offset: u64,
    buf: &mut [u8],
) -> Result<usize, String> {
    if buf.is_empty() {
        return Ok(0);
    }
    let mut guard = store().lock().await;
    let session = guard
        .sessions
        .get_mut(session_id)
        .ok_or_else(|| format!("SMB session not found: {session_id}"))?;
    let conn = session.client.connection_mut();
    let max_read = conn
        .params()
        .map(|params| params.max_read_size)
        .unwrap_or(65536);
    let chunk_size = buf.len().min(max_read as usize) as u32;

    let request = ReadRequest {
        padding: 0x50,
        flags: 0,
        length: chunk_size,
        offset,
        file_id,
        minimum_count: 0,
        channel: SMB2_CHANNEL_NONE,
        remaining_bytes: 0,
        read_channel_info: vec![],
    };

    let frame = conn
        .execute(Command::Read, &request, Some(session.tree.tree_id))
        .await
        .map_err(|error| format!("SMB read failed: {error}"))?;

    if frame.header.status == NtStatus::END_OF_FILE {
        return Ok(0);
    }
    if frame.header.status != NtStatus::SUCCESS {
        return Err(format!("SMB read status: {:?}", frame.header.status));
    }

    let mut cursor = ReadCursor::new(&frame.body);
    let response = ReadResponse::unpack(&mut cursor)
        .map_err(|error| format!("SMB read decode failed: {error}"))?;
    let len = response.data.len().min(buf.len());
    buf[..len].copy_from_slice(&response.data[..len]);
    Ok(len)
}

pub(crate) async fn close_smb_file_async(session_id: &str, file_id: FileId) -> Result<(), String> {
    let mut guard = store().lock().await;
    let session = guard
        .sessions
        .get_mut(session_id)
        .ok_or_else(|| format!("SMB session not found: {session_id}"))?;
    let conn = session.client.connection_mut();
    let request = CloseRequest { flags: 0, file_id };
    let frame = conn
        .execute(Command::Close, &request, Some(session.tree.tree_id))
        .await
        .map_err(|error| format!("SMB close failed: {error}"))?;
    if frame.header.status != NtStatus::SUCCESS {
        return Err(format!("SMB close status: {:?}", frame.header.status));
    }
    Ok(())
}

pub fn read_bytes_bounded(path: &str, max_len: u64) -> Result<Vec<u8>, String> {
    let parsed = parse_smb_path(path)?;
    let size = block_on(stat_file_async(
        &parsed.session_id,
        &parsed.relative_path,
    ))?;
    if size > max_len {
        return Err(format!(
            "SMB file size {size} exceeds limit {max_len} bytes"
        ));
    }
    read_bytes(path)
}

