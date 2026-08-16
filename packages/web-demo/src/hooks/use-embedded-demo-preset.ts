import { useAtomSet } from "@effect-atom/atom-solid";
import { createEffect, onCleanup } from "solid-js";

import { demoAlignUiActions, demoAlignUiAtom } from "../atoms/demo-align-ui";
import { demoAnnotatorUiActions, demoAnnotatorUiAtom } from "../atoms/demo-annotator-ui";
import { loadAlignerDemoPreset, loadAnnotatorDemoPreset } from "../browser/demo-presets";

export type EmbeddedDemoPreset = "aligner" | "annotator";

/** Loads ibidi sample images — embedded landing previews only. */
export function useEmbeddedDemoPreset(
  embedded: boolean,
  preset: EmbeddedDemoPreset | null,
  hasFrame: boolean,
) {
  const setAlignState = useAtomSet(demoAlignUiAtom);
  const setAnnotatorState = useAtomSet(demoAnnotatorUiAtom);

  createEffect(() => {
    if (!embedded || !preset || hasFrame) return;

    let cancelled = false;

    const load = async () => {
      if (preset === "aligner") {
        demoAlignUiActions.setFrameLoading(setAlignState, true);
        demoAlignUiActions.setError(setAlignState, null);
        demoAlignUiActions.setStatus(setAlignState, "Loading sample image");
        try {
          const sample = await loadAlignerDemoPreset();
          if (cancelled) return;
          demoAlignUiActions.applyDemoPreset(setAlignState, sample);
        } catch (cause) {
          if (cancelled) return;
          demoAlignUiActions.setError(
            setAlignState,
            cause instanceof Error ? cause.message : String(cause),
          );
          demoAlignUiActions.setStatus(setAlignState, null);
        } finally {
          if (!cancelled) demoAlignUiActions.setFrameLoading(setAlignState, false);
        }
        return;
      }

      demoAnnotatorUiActions.setFrameLoading(setAnnotatorState, true);
      demoAnnotatorUiActions.setError(setAnnotatorState, null);
      demoAnnotatorUiActions.setStatus(setAnnotatorState, "Loading sample image");
      try {
        const sample = await loadAnnotatorDemoPreset();
        if (cancelled) return;
        demoAnnotatorUiActions.applyDemoPreset(setAnnotatorState, sample);
      } catch (cause) {
        if (cancelled) return;
        demoAnnotatorUiActions.setError(
          setAnnotatorState,
          cause instanceof Error ? cause.message : String(cause),
        );
        demoAnnotatorUiActions.setStatus(setAnnotatorState, null);
      } finally {
        if (!cancelled) demoAnnotatorUiActions.setFrameLoading(setAnnotatorState, false);
      }
    };

    void load();

    onCleanup(() => {
      cancelled = true;
    });
  });
}
