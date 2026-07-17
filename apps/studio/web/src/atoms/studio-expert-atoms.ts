import { Atom } from "@effect-atom/atom-solid";
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/utils";

const EXPERT_MODE_KEY = "lisca-studio-expert-mode";

export const studioExpertModeAtom = Atom.make<boolean>(
  readStorageJson<boolean>(liscaSessionStorage(), EXPERT_MODE_KEY) ?? false,
).pipe(Atom.keepAlive);

export function setStudioExpertMode(value: boolean): void {
  writeStorageJson(liscaSessionStorage(), EXPERT_MODE_KEY, value);
}
