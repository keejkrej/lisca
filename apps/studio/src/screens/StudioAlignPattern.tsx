import { useMemo } from "react";

import {
  AlignPatternWorkspace,
  type AlignPatternCommitHandler,
  type AlignPatternStatus,
  type AlignStore,
} from "lisca/shared/react";
import type { ViewerDataPort } from "lisca/shared/contracts";
import { useStudioStore } from "../studioStore";

export function StudioAlignPattern({
  dataPort,
  store,
  onRegisterCommit,
  onStatusChange,
}: {
  dataPort: ViewerDataPort | null;
  store: AlignStore;
  onRegisterCommit: (handler: AlignPatternCommitHandler | null) => void;
  onStatusChange: (status: AlignPatternStatus) => void;
}) {
  const info1 = useStudioStore((s) => s.info1);

  const key = useMemo(
    () =>
      `${info1.dataPath.trim()}|${info1.saveTo.trim()}|${dataPort ? "host" : "web"}`,
    [dataPort, info1.dataPath, info1.saveTo],
  );

  return (
    <AlignPatternWorkspace
      key={key}
      store={store}
      dataPort={dataPort}
      dataPath={info1.dataPath}
      saveTo={info1.saveTo}
      onRegisterCommit={onRegisterCommit}
      onStatusChange={onStatusChange}
    />
  );
}
