//! Workspace compatibility migrations.
//!
//! Ordered, idempotent rewrites of on-disk workspace files so live parsers can
//! stay strict. Call [`migrate_workspace`] once when a tool opens a workspace,
//! before any bbox or `assay.json` read or write.

mod assay_samples_by_name;
mod bbox_crop_to_roi;
mod killing_traces_dir;
mod ordered_json;

use std::{fs, path::Path};

use uuid::Uuid;

/// Run registered workspace migrations in order.
///
/// Returns paths that were rewritten. A second call is a no-op.
pub fn migrate_workspace(workspace: &Path) -> Result<Vec<String>, String> {
    let mut rewritten = bbox_crop_to_roi::apply(workspace)?;
    rewritten.extend(assay_samples_by_name::apply(workspace)?);
    rewritten.extend(killing_traces_dir::apply(workspace)?);
    Ok(rewritten)
}

/// Replace `path` with `contents` via a sibling temp file and rename.
fn atomic_write(path: &Path, contents: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("{} has no parent directory", path.display()))?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("{} has a non-utf8 name", path.display()))?;
    let tmp = parent.join(format!(".{file_name}.{}.tmp", Uuid::new_v4().simple()));
    if let Err(error) = fs::write(&tmp, contents) {
        let _ = fs::remove_file(&tmp);
        return Err(error.to_string());
    }
    if let Err(error) = fs::rename(&tmp, path) {
        let _ = fs::remove_file(&tmp);
        return Err(error.to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn write_bbox(workspace: &Path, name: &str, contents: &str) {
        let bbox_dir = workspace.join(lisca_workspace::BBOX_DIR);
        fs::create_dir_all(&bbox_dir).expect("bbox dir");
        fs::write(bbox_dir.join(name), contents).expect("write bbox");
    }

    #[test]
    fn migrate_workspace_rewrites_crop_header_to_roi() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        write_bbox(
            workspace,
            "Pos0.csv",
            "crop,x,y,w,h,i,j\n5,1,2,3,4,0,1\n1,0,0,1,1,0,0\n",
        );

        let rewritten = migrate_workspace(workspace).expect("migrate");
        assert_eq!(rewritten.len(), 1);
        assert!(rewritten[0].ends_with("Pos0.csv"));

        let text = fs::read_to_string(lisca_workspace::bbox_csv_path(workspace, 0)).expect("read");
        assert_eq!(text, "roi,x,y,w,h,i,j\n5,1,2,3,4,0,1\n1,0,0,1,1,0,0\n");
    }

    #[test]
    fn migrate_workspace_is_idempotent_for_roi_headers() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        write_bbox(workspace, "Pos1.csv", "roi,x,y,w,h,i,j\n0,1,2,3,4,0,0\n");

        let first = migrate_workspace(workspace).expect("first");
        let second = migrate_workspace(workspace).expect("second");
        assert!(first.is_empty());
        assert!(second.is_empty());
        assert_eq!(
            fs::read_to_string(lisca_workspace::bbox_csv_path(workspace, 1)).expect("read"),
            "roi,x,y,w,h,i,j\n0,1,2,3,4,0,0\n"
        );
    }

    #[test]
    fn migrate_workspace_errors_when_crop_and_roi_both_present() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        write_bbox(workspace, "Pos2.csv", "crop,roi,x,y,w,h\n0,0,1,2,3,4\n");

        let error = migrate_workspace(workspace).expect_err("both columns");
        assert!(error.contains("crop"));
        assert!(error.contains("roi"));
    }

    #[test]
    fn migrate_workspace_errors_when_neither_crop_nor_roi_present() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        write_bbox(workspace, "Pos3.csv", "x,y,w,h\n1,2,3,4\n");

        let error = migrate_workspace(workspace).expect_err("neither column");
        assert!(error.contains("missing required columns (roi, x, y, w, h)"));
    }

    #[test]
    fn migrate_workspace_is_noop_without_bbox_dir() {
        let root = tempfile::tempdir().expect("tempdir");
        let rewritten = migrate_workspace(root.path()).expect("migrate");
        assert!(rewritten.is_empty());
    }

    #[test]
    fn migrate_workspace_runs_assay_and_traces_migrations() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        fs::write(
            workspace.join("assay.json"),
            r#"{"samples":[{"slideChannel":0,"name":"WT","positions":"1"}]}"#,
        )
        .expect("assay.json");
        fs::create_dir_all(workspace.join("timeseries/Pos1")).expect("timeseries dir");
        fs::write(workspace.join("timeseries/Pos1/ch0.csv"), "roi,t,p_dead\n").expect("csv");

        let rewritten = migrate_workspace(workspace).expect("migrate");
        assert_eq!(rewritten.len(), 2, "{rewritten:?}");
        assert!(!fs::read_to_string(workspace.join("assay.json"))
            .expect("read")
            .contains("slideChannel"));
        assert!(workspace.join("traces/Pos1/ch0.csv").is_file());
        assert!(migrate_workspace(workspace).expect("second").is_empty());
    }
}
