import { runClientEffect } from "@lisca/client/runtime";
import type { MemoryKind } from "@lisca/contracts";
import { useEffect, useState } from "react";

import { studioProfileClient } from "../api/studio-profile-port";
import { useStudioProfile } from "../components/studio-profile-provider";

export function useStudioMemoryRecent(kind: MemoryKind, enabled: boolean) {
  const { session, canUseMemory } = useStudioProfile();
  const [loading, setLoading] = useState(false);

  const [workspaces, setWorkspaces] = useState<
    Array<{ path: string; label?: string }>
  >([]);
  const [sources, setSources] = useState<
    Array<{ source: import("@lisca/contracts").AlignerSource; label?: string }>
  >([]);
  const [assays, setAssays] = useState<
    Array<{ path: string; assayLabel?: string; workspacePath?: string }>
  >([]);

  useEffect(() => {
    if (!enabled || !canUseMemory || session.mode !== "profile") {
      setWorkspaces([]);
      setSources([]);
      setAssays([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void runClientEffect(
      studioProfileClient.getRecentMemory(session.profileId, kind),
    )
      .then((response) => {
        if (cancelled) return;
        if (kind === "workspace") {
          setWorkspaces(
            response.workspaces?.map((entry) => ({
              path: entry.path,
              label: entry.label,
            })) ?? [],
          );
        }
        if (kind === "source") {
          setSources(
            response.sources?.map((entry) => ({
              source: entry.source,
              label: entry.label,
            })) ?? [],
          );
        }
        if (kind === "assay") {
          setAssays(
            response.assays?.map((entry) => ({
              path: entry.path,
              assayLabel: entry.assayLabel,
              workspacePath: entry.workspacePath,
            })) ?? [],
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspaces([]);
          setSources([]);
          setAssays([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canUseMemory, enabled, kind, session]);

  return { loading, workspaces, sources, assays };
}
