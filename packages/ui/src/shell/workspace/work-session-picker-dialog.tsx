import {
  formatWorkSessionWhen,
  useWorkSessionPickerState,
  workSessionPickerDescription,
  type WorkSessionPickerItem,
} from "@lisca/ui-headless/work-session-picker";
import type { LiscaAppId } from "@lisca/utils";
import { Button } from "../../components/ui/button";
import { DialogSurface } from "../modal/dialog-surface";
import { ModalScrim } from "../modal/modal-scrim";

export type WorkSessionPickerDialogProps = {
  appId: LiscaAppId;
  open: boolean;
  sessions: WorkSessionPickerItem[];
  onRestore: (sessionId: string) => void;
  onStartNew: () => void;
};

export function WorkSessionPickerDialog({
  appId,
  open,
  sessions,
  onRestore,
  onStartNew,
}: WorkSessionPickerDialogProps) {
  const state = useWorkSessionPickerState(open, sessions);
  if (!state.open) return null;

  return (
    <ModalScrim zIndex="z-50">
      <DialogSurface aria-label="Resume a recent session" className="p-5" maxWidth="sm">
        <div className="space-y-4">
          <div>
            <h2 className="font-medium text-foreground">Resume a session</h2>
            <p className="text-muted-foreground text-sm">{workSessionPickerDescription(appId)}</p>
          </div>
          <ul className="max-h-72 space-y-2 overflow-auto">
            {state.items.map((item) => (
              <li key={item.id}>
                <button
                  className="w-full rounded-md border border-border px-3 py-2 text-left hover:bg-muted"
                  type="button"
                  onClick={() => onRestore(item.id)}
                >
                  <div className="font-medium text-foreground text-sm">{item.label}</div>
                  <div className="truncate text-muted-foreground text-xs">{item.path}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatWorkSessionWhen(item.lastOpenedAt)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <Button
            className="w-full justify-center"
            size="sm"
            type="button"
            variant="outline"
            onClick={onStartNew}
          >
            Start new session
          </Button>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
