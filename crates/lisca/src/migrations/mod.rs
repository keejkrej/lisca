//! Workspace compatibility migrations.
//!
//! Ordered, idempotent rewrites of on-disk workspace files so live parsers can
//! stay strict. Call [`migrate_workspace`] once when a tool opens a workspace,
//! before any bbox read or write.

mod bbox_crop_to_roi;

use std::path::Path;

/// Run registered workspace migrations in order.
///
/// Returns paths that were rewritten. A second call is a no-op.
pub fn migrate_workspace(workspace: &Path) -> Result<Vec<String>, String> {
    bbox_crop_to_roi::apply(workspace)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn write_bbox(workspace: &Path, name: &str, contents: &str) {
        let bbox_dir = workspace.join("bbox");
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

        let text = fs::read_to_string(workspace.join("bbox/Pos0.csv")).expect("read");
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
            fs::read_to_string(workspace.join("bbox/Pos1.csv")).expect("read"),
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
}
