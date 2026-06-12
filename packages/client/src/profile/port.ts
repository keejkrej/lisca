import type {
  MemoryKind,
  MemoryRecentResponse,
  MemoryTouchRequest,
  MemoryTouchResponse,
  ProfileListResponse,
  ProfileSessionResponse,
  ProfileSignOutResponse,
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
  createProfile(displayName: string, signal?: AbortSignal): ClientEffect<ProfileSessionResponse>;
  signInProfile(displayName: string, signal?: AbortSignal): ClientEffect<ProfileSessionResponse>;
  signOutProfile(signal?: AbortSignal): ClientEffect<ProfileSignOutResponse>;
  getRecentMemory(type: MemoryKind, signal?: AbortSignal): ClientEffect<MemoryRecentResponse>;
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
    signOutProfile(signal) {
      return withClientEffect(client, signal, (c) => c.profile.signOutProfile());
    },
    getRecentMemory(type, signal) {
      return withClientEffect(client, signal, (c) =>
        c.memory.getRecentMemory({ urlParams: { type } }),
      );
    },
    touchMemory(payload, signal) {
      return withClientEffect(client, signal, (c) => c.memory.touchMemory({ payload }));
    },
  };
}

export function revokeStudioProfileSession(port: ProfilePort): void {
  void Effect.runPromise(port.signOutProfile()).catch(() => undefined);
}
