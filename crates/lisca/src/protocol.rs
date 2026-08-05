//! Cross-language wire + on-disk contract types.
//!
//! Effect Schema in `@lisca/contracts` is the single source of truth. Types are
//! generated from the contract JSON Schema (via `typify`) into [`generated`]
//! and re-exported here. `gen-rust-schema.ts` normalizes union encoding
//! (`anyOf` + `$ref` → inline `oneOf`) so typify emits internally-tagged
//! enums like `AlignerSource`.

// typify intentionally emits explicit Default impls for some schema objects.
#[allow(clippy::derivable_impls)]
mod generated;

pub use generated::*;

pub type ImageSource = AlignerSource;

impl AppId {
    pub const fn as_str(self) -> &'static str {
        match self {
            AppId::Aligner => "aligner",
            AppId::Annotator => "annotator",
            AppId::Studio => "studio",
        }
    }
}

impl AssayIntervalUnit {
    pub const fn as_str(self) -> &'static str {
        match self {
            AssayIntervalUnit::Second => "second",
            AssayIntervalUnit::Minute => "minute",
            AssayIntervalUnit::Hour => "hour",
        }
    }
}

#[cfg(test)]
mod contract_tests {
    //! Locks the cross-language wire shape of the generated types against the
    //! Effect contract. If the contract changes shape, these round-trips break
    //! and signal that protocol types must be regenerated
    //! (`vp run --filter @lisca/contracts rust-types`).
    use super::*;
    use serde_json::json;

    #[test]
    fn aligner_source_is_internally_tagged() {
        let source = AlignerSource::Folder {
            path: "/data".into(),
            subfolder_template: "Pos{p}".into(),
            filename_template: "img_{t}".into(),
        };
        let value = serde_json::to_value(&source).unwrap();
        assert_eq!(value["kind"], "folder");
        assert_eq!(value["subfolderTemplate"], "Pos{p}");
        let back: AlignerSource = serde_json::from_value(value.clone()).unwrap();
        assert_eq!(serde_json::to_value(&back).unwrap(), value);
    }

    #[test]
    fn frame_payload_uses_camel_case_and_pixel_type_enum() {
        let value = json!({
            "width": 4,
            "height": 4,
            "dataBase64": "AA==",
            "pixelType": "uint8",
            "contrastDomain": { "min": 0, "max": 255 },
            "suggestedContrast": { "min": 0, "max": 255 },
            "appliedContrast": { "min": 0, "max": 255 },
        });
        let payload: FramePayload = serde_json::from_value(value).unwrap();
        assert_eq!(payload.pixel_type, PixelType::Uint8);
        let reser = serde_json::to_value(&payload).unwrap();
        assert_eq!(reser["pixelType"], "uint8");
    }

    #[test]
    fn memory_touch_request_uses_tagged_camel_case_fields() {
        let value = json!({
            "kind": "assay",
            "path": "/assays/run-1",
            "assayLabel": "Reporter",
            "workspacePath": "/workspaces/run-1",
        });
        let request: MemoryTouchRequest = serde_json::from_value(value.clone()).unwrap();
        let MemoryTouchRequest::Assay {
            path,
            assay_label,
            workspace_path,
        } = request
        else {
            panic!("expected assay memory touch");
        };
        assert_eq!(path, "/assays/run-1");
        assert_eq!(assay_label.as_deref(), Some("Reporter"));
        assert_eq!(workspace_path.as_deref(), Some("/workspaces/run-1"));

        let serialized = serde_json::to_value(MemoryTouchRequest::Assay {
            path,
            assay_label,
            workspace_path,
        })
        .unwrap();
        assert_eq!(serialized, value);
    }

    #[test]
    fn roi_index_entry_omits_shape() {
        let entry: RoiIndexEntry = serde_json::from_value(json!({
            "roi": 0,
            "fileName": "roi0.tif",
            "bbox": { "roi": 0, "x": 1, "y": 2, "w": 3, "h": 4 },
        }))
        .unwrap();
        assert_eq!(entry.roi, 0);
        assert_eq!(entry.bbox.w, 3);
        assert_eq!(entry.bbox.h, 4);
    }

    #[test]
    fn task_detail_preserves_operation_task_and_attempt_ids() {
        let value = json!({
            "operation": {
                "operationId": "op-1",
                "kind": "test-operation",
                "workspaceId": "workspace-1",
                "workspacePath": "/workspace",
                "mutating": true,
                "status": "running",
                "attention": "none",
                "progress": {
                    "total": 1,
                    "queued": 0,
                    "blocked": 0,
                    "running": 1,
                    "completed": 0,
                    "failed": 0,
                    "cancelled": 0,
                    "cancellationRequested": 0
                },
                "createdAtMs": 1,
                "updatedAtMs": 2
            },
            "tasks": [{
                "taskId": "task-1",
                "operationId": "op-1",
                "taskKind": "test-task",
                "workspaceId": "workspace-1",
                "status": "running",
                "weight": 1,
                "enqueueOrder": 0,
                "dependencies": [],
                "blockedBy": [],
                "attempts": [{
                    "attemptId": "attempt-1",
                    "operationId": "op-1",
                    "taskId": "task-1",
                    "status": "running",
                    "startedAtMs": 2,
                    "finishedAtMs": null,
                    "error": null
                }]
            }]
        });
        let detail: OperationDetail = serde_json::from_value(value).unwrap();
        assert_eq!(detail.operation.operation_id, "op-1");
        assert_eq!(detail.tasks[0].task_id, "task-1");
        assert_eq!(detail.tasks[0].attempts[0].attempt_id, "attempt-1");
    }
}
