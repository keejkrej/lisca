import { ViewerAlignPattern } from "lisca/viewer/react";
import { useMemo } from "react";

import type { ViewerDataPort } from "lisca/viewer/contracts";
import { useStudioStore } from "../studioStore";

export function StudioAlignPattern({
  dataPort,
  onRegisterCommit,
}: {
  dataPort: ViewerDataPort | null;
  onRegisterCommit: (handler: (() => Promise<void>) | null) => void;
}) {
  const info1 = useStudioStore((s) => s.info1);

  const key = useMemo(
    () =>
      `${info1.dataPath.trim()}|${info1.saveTo.trim()}|${dataPort ? "host" : "web"}`,
    [dataPort, info1.dataPath, info1.saveTo],
  );

  return (
    <ViewerAlignPattern
      key={key}
      dataPort={dataPort}
      dataPath={info1.dataPath}
      saveTo={info1.saveTo}
      onRegisterCommit={onRegisterCommit}
    />
  );
}
