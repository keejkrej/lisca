import { AlignerShellPage } from "../shell/shell-page";
import { WorkspaceBody } from "./workspace-body";

export function RoiPage() {
  return (
    <AlignerShellPage mode="roi">
      {(probe) => <WorkspaceBody mode="roi" probe={probe} />}
    </AlignerShellPage>
  );
}
