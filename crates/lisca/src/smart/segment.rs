use crate::protocol::{SmartSegmentRequest, SmartSegmentResponse};

pub fn segment_mask(_request: SmartSegmentRequest) -> Result<SmartSegmentResponse, String> {
    Err(
        "server-side smart segmentation is not available yet; use the browser demo provider"
            .to_string(),
    )
}