import { AlignerShellPage } from "../shell/shell-page";
import { WorkspaceBody } from "./workspace-body";

export function RawPage() {
  return (
    <AlignerShellPage mode="raw">
      {(probe) => <WorkspaceBody mode="raw" probe={probe} />}
    </AlignerShellPage>
  );
}
