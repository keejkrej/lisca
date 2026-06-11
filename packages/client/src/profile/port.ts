import type {
  MemoryKind,
  MemoryRecentResponse,
  MemoryTouchRequest,
  MemoryTouchResponse,
  ProfileListResponse,
  ProfileResponse,
} from "@lisca/contracts";
import { Effect } from "effect";

import {
  createApiClient,
  toClientEffect,
  type ApiClientDeps,
  type LiscaApiClient,
} from "../infra/api-client";
import type { ClientEffect } from "../infra/runtime";
import { withOptionalAbortSignal } from "../infra/with-abort-signal";

export type ProfilePortDeps = ApiClientDeps;

export type ProfilePort = {
  listProfiles(signal?: AbortSignal): ClientEffect<ProfileListResponse>;
  createProfile(displayName: string, signal?: AbortSignal): ClientEffect<ProfileResponse>;
  signInProfile(displayName: string, signal?: AbortSignal): ClientEffect<ProfileResponse>;
  getRecentMemory(
    profileId: string,
    type: MemoryKind,
    signal?: AbortSignal,
  ): ClientEffect<MemoryRecentResponse>;
  touchMemory(payload: MemoryTouchRequest, signal?: AbortSignal): ClientEffect<MemoryTouchResponse>;
};

function withClientEffect<A, E>(
  client: LiscaApiClient,
  signal: AbortSignal | undefined,
  run: (client: LiscaApiClient) => Effect.Effect<A, E>,
): ClientEffect<A> {
  return withOptionalAbortSignal(toClientEffect(run(client)), signal);
}

export function createProfilePort(deps: ProfilePortDeps): ProfilePort {
  const client = createApiClient(deps);

  return {
    listProfiles(signal) {
      return withClientEffect(client, signal, (c) => c.profile.listProfiles());
    },
    createProfile(displayName, signal) {
      return withClientEffect(client, signal, (c) =>
        c.profile.createProfile({ payload: { displayName } }),
      );
    },
    signInProfile(displayName, signal) {
      return withClientEffect(client, signal, (c) =>
        c.profile.signInProfile({ payload: { displayName } }),
      );
    },
    getRecentMemory(profileId, type, signal) {
      return withClientEffect(client, signal, (c) =>
        c.memory.getRecentMemory({ urlParams: { profileId, type } }),
      );
    },
    touchMemory(payload, signal) {
      return withClientEffect(client, signal, (c) => {
        switch (payload.kind) {
          case "workspace":
            return c.memory.touchMemory({
              payload: {
                profileId: payload.profileId,
                kind: "workspace",
                path: payload.path,
                label: payload.label,
              },
            });
          case "source":
            return c.memory.touchMemory({
              payload: {
                profileId: payload.profileId,
                kind: "source",
                source: payload.source,
                label: payload.label,
              },
            });
          case "assay":
            return c.memory.touchMemory({
              payload: {
                profileId: payload.profileId,
                kind: "assay",
                path: payload.path,
                assayLabel: payload.assayLabel,
                workspacePath: payload.workspacePath,
              },
            });
        }
      });
    },
  };
}
