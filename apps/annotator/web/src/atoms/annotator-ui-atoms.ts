import { AtomRegistry } from "effect/reactivity";
import {
  annotatorUiActions,
  annotatorUiAtom,
  createInitialAnnotatorUiState,
  readAnnotatorSession,
} from "@lisca/client/atoms/annotator-ui";

export { annotatorUiActions, annotatorUiAtom, createInitialAnnotatorUiState, readAnnotatorSession };

export function createAnnotatorRegistry(): AtomRegistry.AtomRegistry {
  const registry = AtomRegistry.make();
  registry.set(annotatorUiAtom, createInitialAnnotatorUiState());
  return registry;
}

export let annotatorRegistry: AtomRegistry.AtomRegistry = createAnnotatorRegistry();

export function resetAnnotatorRegistry(): AtomRegistry.AtomRegistry {
  annotatorRegistry.dispose();
  annotatorRegistry = createAnnotatorRegistry();
  return annotatorRegistry;
}
