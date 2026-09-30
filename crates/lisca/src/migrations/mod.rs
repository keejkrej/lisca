//! Workspace compatibility migrations.
//!
//! Ordered, idempotent rewrites of on-disk workspace files so live parsers can
//! stay strict. Call [`migrate_workspace`] once when a tool opens a workspace,
//! before any bbox or align state read or write.

mod align_excluded_patterns;
mod bbox_crop_to_roi;

use std::path::Path;

/// Run registered workspace migrations in order.
///
/// Returns paths that were rewritten. A second call is a no-op.
pub fn migrate_workspace(workspace: &Path) -> Result<Vec<String>, String> {
    let mut rewritten = bbox_crop_to_roi::apply(workspace)?;
    rewritten.extend(align_excluded_patterns::apply(workspace)?);
    Ok(rewritten)
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
    fn migrate_workspace_rewrites_align_excluded_cells_to_patterns() {
        let root = tempfile::tempdir().expect("tempdir");
        let workspace = root.path();
        let align_dir = workspace.join(lisca_workspace::ALIGN_DIR);
        fs::create_dir_all(&align_dir).expect("align dir");
        fs::write(
            align_dir.join("Pos0.json"),
            r#"{"grid":{"cellWidth":4,"cellHeight":4},"excludedCells":[{"i":0,"j":1}]}"#,
        )
        .expect("write align");

        let rewritten = migrate_workspace(workspace).expect("migrate");
        assert_eq!(rewritten.len(), 1);
        assert!(rewritten[0].ends_with("Pos0.json"));
        let value: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(lisca_workspace::align_json_path(workspace, 0)).expect("read"),
        )
        .expect("json");
        assert_eq!(
            value["excludedPatterns"],
            serde_json::json!([{ "i": 0, "j": 1 }])
        );
        assert_eq!(value["grid"]["patternWidth"], serde_json::json!(4));
        assert!(migrate_workspace(workspace).expect("second").is_empty());
    }

    #[test]
    fn migrate_workspace_is_noop_without_bbox_dir() {
        let root = tempfile::tempdir().expect("tempdir");
        let rewritten = migrate_workspace(root.path()).expect("migrate");
        assert!(rewritten.is_empty());
    }
}
