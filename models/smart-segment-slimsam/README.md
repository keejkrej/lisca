# Smart segment SlimSAM

ONNX SlimSAM model for LiSCA **Smart segment**: click-prompted binary masks per ROI frame.

Source: [Xenova/slimsam-77-uniform](https://huggingface.co/Xenova/slimsam-77-uniform) (quantized encoder + prompt/mask decoder).

## Files

| File | Role |
| --- | --- |
| `onnx/vision_encoder_quantized.onnx` | Image encoder (`pixel_values` → embeddings) |
| `onnx/prompt_encoder_mask_decoder_quantized.onnx` | Prompt decoder (`input_points`, `input_labels`, embeddings → `pred_masks`, `iou_scores`) |

## Server path

Rust resolves models from, in order:

1. `LISCA_SMART_SEGMENT_MODEL` (directory containing both ONNX files)
2. `models/smart-segment-slimsam/onnx/` relative to the workspace

## Preprocessing

- Longest image edge resized to 1024 px (aspect preserved)
- Pad to 1024×1024 with ImageNet mean/std normalization on RGB
- Prompt coordinates scaled to the resized frame before decoder inference