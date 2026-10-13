//! Label-free handlers on the Studio router.
//!
//! Desktop dispatches these through Tauri IPC. Hosted Studio uses same-origin
//! HTTP. This module does not bind a socket.

use axum::extract::Query;
use axum::Json;

use crate::http::FsError;
use crate::protocol::{
    LabelFreeBuild, LabelFreeClassification, LabelFreeClassificationList, LabelFreeClassifyRequest,
    LabelFreeHealth, LabelFreeLabelCount, LabelFreeReferenceQuery, LabelFreeReferenceRequest,
    LabelFreeReferenceSet, LabelFreeReferenceSetList, LabelFreeRuntime,
};

use super::embed::{DIMENSIONS, MODEL_ID, REVISION};
use super::service::{self, ClassificationRow, InferenceFailure, ReferenceSetSummary, CACHE_CAP};

pub fn cuda_bundled() -> bool {
    cfg!(feature = "cuda")
}

pub fn health_report() -> LabelFreeHealth {
    if cfg!(feature = "label-free") {
        LabelFreeHealth {
            api_version: 1,
            runtime: LabelFreeRuntime::Embedded,
            build: LabelFreeBuild::LabelFree,
            cuda_bundled: cuda_bundled(),
            model_id: Some(MODEL_ID.to_string()),
            revision: Some(REVISION.to_string()),
            dimensions: Some(DIMENSIONS as u32),
            device: Some("cpu".to_string()),
            batch_size: 32,
            queue_depth: 0,
            cache_cap: CACHE_CAP as u32,
        }
    } else {
        LabelFreeHealth {
            api_version: 1,
            runtime: LabelFreeRuntime::Embedded,
            build: LabelFreeBuild::Light,
            cuda_bundled: false,
            model_id: None,
            revision: None,
            dimensions: None,
            device: None,
            batch_size: 0,
            queue_depth: 0,
            cache_cap: 0,
        }
    }
}

pub async fn health() -> Json<LabelFreeHealth> {
    Json(health_report())
}

pub async fn list_references(
    Query(query): Query<LabelFreeReferenceQuery>,
) -> Result<Json<LabelFreeReferenceSetList>, FsError> {
    let sets = spawn_inference(move || service::list_reference_sets(&query.workspace_path)).await?;
    let wire = sets
        .into_iter()
        .map(reference_set)
        .collect::<Result<Vec<_>, _>>()
        .map_err(failure_error)?;
    Ok(Json(LabelFreeReferenceSetList(wire)))
}

pub async fn build_references(
    Json(body): Json<LabelFreeReferenceRequest>,
) -> Result<Json<LabelFreeReferenceSet>, FsError> {
    let summary =
        spawn_inference(move || service::build_from_annotations(&body.workspace_path, &body.name))
            .await?;
    Ok(Json(reference_set(summary).map_err(failure_error)?))
}

pub async fn classify(
    Json(body): Json<LabelFreeClassifyRequest>,
) -> Result<Json<LabelFreeClassificationList>, FsError> {
    let rows = spawn_inference(move || {
        service::classify(&body.workspace_path, &body.name, body.limit as usize)
    })
    .await?;
    let wire = rows
        .into_iter()
        .map(classification)
        .collect::<Result<Vec<_>, _>>()
        .map_err(failure_error)?;
    Ok(Json(LabelFreeClassificationList(wire)))
}

fn reference_set(summary: ReferenceSetSummary) -> Result<LabelFreeReferenceSet, InferenceFailure> {
    let labels = summary
        .labels
        .into_iter()
        .map(|(label, count)| {
            Ok(LabelFreeLabelCount {
                label,
                count: as_u32(count)?,
            })
        })
        .collect::<Result<Vec<_>, InferenceFailure>>()?;
    Ok(LabelFreeReferenceSet {
        name: summary.name,
        count: as_u32(summary.count)?,
        labels,
        model_id: summary.model_id,
        revision: summary.revision,
        encoder_id: summary.encoder_id,
    })
}

fn classification(row: ClassificationRow) -> Result<LabelFreeClassification, InferenceFailure> {
    Ok(LabelFreeClassification {
        pos: row.pos,
        roi: row.roi,
        channel: row.channel,
        time: row.time,
        z: row.z,
        label_id: row.label_id,
        support: f64::from(row.support),
    })
}

fn as_u32(value: usize) -> Result<u32, InferenceFailure> {
    u32::try_from(value).map_err(|_| InferenceFailure::Io(format!("{value} does not fit in u32")))
}

async fn spawn_inference<T>(
    work: impl FnOnce() -> Result<T, InferenceFailure> + Send + 'static,
) -> Result<T, FsError>
where
    T: Send + 'static,
{
    match tokio::task::spawn_blocking(work).await {
        Ok(Ok(value)) => Ok(value),
        Ok(Err(error)) => Err(failure_error(error)),
        Err(error) => Err(FsError::internal(error.to_string())),
    }
}

fn failure_error(failure: InferenceFailure) -> FsError {
    match failure {
        InferenceFailure::Io(message) => FsError::internal(message),
        other => FsError::new(other.message()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_reports_the_studio_build() {
        let health = health_report();
        let value = serde_json::to_value(&health).expect("health json");
        assert_eq!(value["apiVersion"], 1);
        assert_eq!(value["runtime"], "embedded");
        assert_eq!(
            value["cudaBundled"],
            serde_json::Value::Bool(cfg!(feature = "cuda"))
        );
        if cfg!(feature = "label-free") {
            assert_eq!(value["build"], "label-free");
            assert_eq!(value["modelId"], MODEL_ID);
            assert_eq!(value["device"], "cpu");
            assert_eq!(value["dimensions"], serde_json::json!(DIMENSIONS));
        } else {
            assert_eq!(value["build"], "light");
            assert_eq!(value["modelId"], serde_json::Value::Null);
            assert_eq!(value["device"], serde_json::Value::Null);
            assert_eq!(value["dimensions"], serde_json::Value::Null);
        }
    }
}
