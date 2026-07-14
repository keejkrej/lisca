use std::{
    collections::HashMap,
    path::{Component, Path, PathBuf},
    sync::{Arc, Mutex, MutexGuard},
};

mod task_scheduler;
mod tasks;

pub use task_scheduler::{
    OperationSpec, SchedulerConfig, SchedulerError, TaskContext, TaskFailure, TaskScheduler,
    TaskSpec,
};
pub use tasks::{task_router, HasTaskScheduler};

#[derive(Debug)]
pub struct RunStatePoisoned;

#[derive(Clone)]
pub struct KeyedRuns<T> {
    inner: Arc<Mutex<RunBook<T>>>,
}

struct RunBook<T> {
    runs: HashMap<String, T>,
    workspace_requests: HashMap<String, String>,
}

impl<T> KeyedRuns<T> {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(RunBook {
                runs: HashMap::new(),
                workspace_requests: HashMap::new(),
            })),
        }
    }

    fn lock(&self) -> Result<MutexGuard<'_, RunBook<T>>, RunStatePoisoned> {
        self.inner.lock().map_err(|_| RunStatePoisoned)
    }

    pub fn insert_unique(
        &self,
        request_id: String,
        workspace_path: Option<String>,
        run: T,
    ) -> Result<bool, RunStatePoisoned> {
        let mut book = self.lock()?;
        if book.runs.contains_key(&request_id) {
            return Ok(false);
        }
        if let Some(workspace_path) = workspace_path {
            book.workspace_requests
                .insert(workspace_path, request_id.clone());
        }
        book.runs.insert(request_id, run);
        Ok(true)
    }

    pub fn update(
        &self,
        request_id: &str,
        update: impl FnOnce(&mut T),
    ) -> Result<bool, RunStatePoisoned> {
        let mut book = self.lock()?;
        let Some(run) = book.runs.get_mut(request_id) else {
            return Ok(false);
        };
        update(run);
        Ok(true)
    }
}

impl<T: Clone> KeyedRuns<T> {
    pub fn get(&self, request_id: &str) -> Result<Option<T>, RunStatePoisoned> {
        Ok(self.lock()?.runs.get(request_id).cloned())
    }

    pub fn latest(&self, workspace_path: &str) -> Result<Option<T>, RunStatePoisoned> {
        let book = self.lock()?;
        let Some(request_id) = book.workspace_requests.get(workspace_path) else {
            return Ok(None);
        };
        Ok(book.runs.get(request_id).cloned())
    }

    pub fn update_and_get(
        &self,
        request_id: &str,
        update: impl FnOnce(&mut T),
    ) -> Result<Option<T>, RunStatePoisoned> {
        let mut book = self.lock()?;
        let Some(run) = book.runs.get_mut(request_id) else {
            return Ok(None);
        };
        update(run);
        Ok(Some(run.clone()))
    }
}

impl<T> Default for KeyedRuns<T> {
    fn default() -> Self {
        Self::new()
    }
}

pub fn normalize_workspace_path(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let path = Path::new(trimmed);
    path.canonicalize()
        .unwrap_or_else(|_| {
            let absolute = if path.is_absolute() {
                path.to_path_buf()
            } else {
                std::env::current_dir()
                    .map(|current| current.canonicalize().unwrap_or(current).join(path))
                    .unwrap_or_else(|_| path.to_path_buf())
            };
            normalize_lexically(&absolute)
        })
        .to_string_lossy()
        .into_owned()
}

fn normalize_lexically(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Prefix(_) | Component::RootDir | Component::Normal(_) => {
                normalized.push(component.as_os_str());
            }
            Component::CurDir => {}
            Component::ParentDir => {
                if !normalized.pop() && !path.has_root() {
                    normalized.push(Component::ParentDir.as_os_str());
                }
            }
        }
    }
    normalized
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keyed_runs_reject_duplicate_ids_and_track_latest_workspace_run() {
        let runs = KeyedRuns::new();
        assert!(runs
            .insert_unique("one".into(), Some("/workspace".into()), 1)
            .unwrap());
        assert!(!runs
            .insert_unique("one".into(), Some("/other".into()), 2)
            .unwrap());
        assert_eq!(runs.get("one").unwrap(), Some(1));
        assert_eq!(runs.latest("/workspace").unwrap(), Some(1));
        assert_eq!(runs.latest("/other").unwrap(), None);
    }

    #[test]
    fn keyed_runs_update_values() {
        let runs = KeyedRuns::new();
        runs.insert_unique("one".into(), None, 1).unwrap();
        assert!(runs.update("one", |value| *value = 2).unwrap());
        assert!(!runs.update("missing", |_| {}).unwrap());
        assert_eq!(runs.get("one").unwrap(), Some(2));
    }

    #[test]
    fn workspace_keys_are_trimmed_even_when_the_path_does_not_exist() {
        assert_eq!(
            normalize_workspace_path("  /does/not/exist  "),
            "/does/not/exist"
        );
        assert_eq!(normalize_workspace_path("  "), "");
    }

    #[test]
    fn nonexistent_workspace_aliases_are_normalized_lexically() {
        let unique = format!("lisca-missing-workspace-{}", uuid::Uuid::new_v4());
        let direct = normalize_workspace_path(&format!("{unique}/positions"));
        let dotted = normalize_workspace_path(&format!("./{unique}/./positions"));
        let parent = normalize_workspace_path(&format!("{unique}/discarded/../positions"));

        assert_eq!(direct, dotted);
        assert_eq!(direct, parent);
        assert!(Path::new(&direct).is_absolute());
    }
}
