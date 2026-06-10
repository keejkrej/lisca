export type CanvasStatusTone = "default" | "error" | "success";

export type CanvasStatusMessage = {
  text: string;
  tone?: CanvasStatusTone;
};

export type AnnotationMode = "classification" | "segmentation";

export type AlignCanvasStatusTone = CanvasStatusTone;

export type AlignCanvasStatusMessage = CanvasStatusMessage;
