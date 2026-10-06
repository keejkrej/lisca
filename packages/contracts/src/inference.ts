/** Version 1 of the standalone frozen-encoder server protocol. */
export interface InferenceConnection {
  url: string;
  token: string;
}

export interface InferenceHealth {
  api_version: 1;
  model_id: string;
  revision: string;
  dimensions: number;
  device: string;
  batch_size: number;
  queue_depth: number;
  stats: Record<string, number>;
}

export interface ReferenceSet {
  name: string;
  count: number;
  contrast: "frame" | "baseline";
}

export interface ViabilityResult {
  group: string;
  reference_set: string;
  model_id: string;
  revision: string;
  frames: number[];
  frame_source: "roi-index" | "tiff-index";
  channel: number;
  z: number;
  stride: number;
  contrast: "frame" | "baseline";
  history: number;
  viable_support: number[];
  smoothed_support: number[];
  predictions: ("viable" | "dead")[];
  step: {
    viability: (0 | 1)[];
    first_dead_frame: number | null;
    state: "always_dead" | "always_viable" | "transition";
    tied_indices: number[];
    retrospective: true;
  };
  note: string;
}
