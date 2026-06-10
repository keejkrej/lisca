import { Menu, MenuItem, MenuPopup, MenuTrigger, buttonVariants, cn } from "@lisca/ui/components";
import { ShellNavbar } from "@lisca/ui/shell";
import { ChevronDown, Tags } from "lucide-react";

import { useAnnotatePage } from "../state/annotate-page-context";

export function AnnotatorHeader() {
  const { state } = useAnnotatePage();

  return (
    <ShellNavbar.Annotator
      endLeading={
        <Menu>
          <MenuTrigger
            className={cn(
              buttonVariants({
                size: "sm",
                variant: "outline",
                className:
                  "group inline-flex w-fit shrink-0 justify-between gap-2 font-normal text-foreground shadow-none hover:bg-muted/40 data-popup-open:bg-muted/60",
              }),
            )}
          >
            Tools
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[popup-open]:rotate-180" />
          </MenuTrigger>
          <MenuPopup
            align="end"
            className="w-60 rounded-2xl border-border p-2 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
            side="bottom"
            sideOffset={8}
          >
            <MenuItem
              disabled={!state.workspacePath}
              className="h-auto min-h-0 items-start gap-2 py-2.5 text-left"
              onClick={() => {
                state.setLabelError(null);
                state.setLabelDialogOpen(true);
              }}
            >
              <Tags className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Create labels</span>
                <span className="text-muted-foreground text-xs">Define classification labels</span>
              </span>
            </MenuItem>
          </MenuPopup>
        </Menu>
      }
      onPickWorkspace={() => state.setFilePickerOpen(true)}
    />
  );
}
