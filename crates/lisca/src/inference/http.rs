//! Label-free handlers on the Studio router.
//!
//! Desktop dispatches these through Tauri IPC. Hosted Studio uses same-origin
//! HTTP. This module does not bind a socket.

use axum::extract::Query;
use axum::Json;

use crate::http::FsError;
use crate::protocol::{
    LabelFreeClassification, LabelFreeClassificationList, LabelFreeClassifyRequest,
    LabelFreeHealth, LabelFreeKeyRequest, LabelFreeLabelCount, LabelFreeProvider,
    LabelFreeReferenceQuery, LabelFreeReferenceRequest, LabelFreeReferenceSet,
    LabelFreeReferenceSetList,
};

use super::embed::{self, Provider, DIMENSIONS, REVISION};
use super::service::{self, ClassificationRow, InferenceFailure, ReferenceSetSummary, CACHE_CAP};

pub fn health_report() -> LabelFreeHealth {
    let provider = embed::provider();
    LabelFreeHealth {
        api_version: 1,
        provider: match provider {
            Provider::OpenRouter => LabelFreeProvider::OpenRouter,
            Provider::Ollama => LabelFreeProvider::Ollama,
        },
        configured: embed::has_credentials(),
        model_id: provider.model_id().to_string(),
        revision: REVISION.to_string(),
        dimensions: DIMENSIONS as u32,
        batch_size: provider.batch_size() as u32,
        cache_cap: CACHE_CAP as u32,
    }
}

pub async fn health() -> Json<LabelFreeHealth> {
    Json(health_report())
}

pub async fn save_key(
    Json(body): Json<LabelFreeKeyRequest>,
) -> Result<Json<LabelFreeHealth>, FsError> {
    let provider = body
        .provider
        .and_then(|provider| Provider::parse(&provider.to_string()));
    embed::configure(provider, body.api_key.as_deref());
    Ok(Json(health_report()))
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
    let positions = body.positions.clone();
    let rows = spawn_inference(move || {
        service::classify(
            &body.workspace_path,
            &body.name,
            body.limit as usize,
            &positions,
        )
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
    use crate::inference::embed::{set_provider, OPENROUTER_MODEL_ID};

    #[test]
    fn health_reports_openrouter_configuration() {
        let _lock = crate::inference::provider_test_lock();
        set_provider(Provider::OpenRouter);
        let health = health_report();
        let value = serde_json::to_value(&health).expect("health json");
        assert_eq!(value["apiVersion"], 1);
        assert_eq!(value["provider"], "openrouter");
        assert_eq!(value["modelId"], OPENROUTER_MODEL_ID);
        assert_eq!(value["revision"], REVISION);
        assert_eq!(value["dimensions"], serde_json::json!(DIMENSIONS));
    }

    #[test]
    fn health_reports_the_local_ollama_provider() {
        let _lock = crate::inference::provider_test_lock();
        set_provider(Provider::Ollama);
        let health = health_report();
        let value = serde_json::to_value(&health).expect("health json");
        assert_eq!(value["provider"], "ollama");
        assert_eq!(value["modelId"], super::super::embed::OLLAMA_MODEL_ID);
        // Local inference needs no credential.
        assert_eq!(value["configured"], true);
        set_provider(Provider::OpenRouter);
    }
}
