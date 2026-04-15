import { Button, cn } from "lisca/shared/ui";
import { Plus, Trash2 } from "lucide-react";

import { SidebarSection } from "lisca/shared/react";
import { useRoiAnnotationContext } from "../RoiAnnotationContext";

export default function AnnotationToolbarInstances() {
  const {
    annotationInstances,
    activeInstanceId,
    addAnnotationInstance,
    removeAnnotationInstance,
    setActiveInstanceId,
    canEdit,
    loading,
  } = useRoiAnnotationContext();

  return (
    <SidebarSection
      title="Objects"
      action={
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          disabled={!canEdit || loading}
          onClick={() => addAnnotationInstance()}
        >
          <Plus className="size-3.5" />
        </Button>
      }
    >
      {annotationInstances.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Add an object to paint its region.</p>
      ) : (
        <ul className="space-y-1">
          {annotationInstances.map((inst) => {
            const active = activeInstanceId === inst.id;
            return (
              <li key={inst.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "min-w-0 flex-1 rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition-colors",
                    active
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border/80 bg-card/40 text-muted-foreground hover:bg-card/60",
                  )}
                  disabled={loading}
                  onClick={() => setActiveInstanceId(inst.id)}
                >
                  {inst.name}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={loading}
                  aria-label={`Remove ${inst.name}`}
                  onClick={() => removeAnnotationInstance(inst.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </SidebarSection>
  );
}
