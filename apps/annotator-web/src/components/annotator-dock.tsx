import type { AnnotationMode, RoiFrameRequest } from "@lisca/contracts";
import { Button, ReadonlyPathField, Section, cn, type AnnotationTool } from "@lisca/ui";
import { annotationOutputPaths } from "../utils/annotation-output";

export function AnnotatorDock(props: {
  mode: AnnotationMode;
  tool: AnnotationTool;
  request: RoiFrameRequest | null;
  canSave: boolean;
  saving: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onSave: () => void;
}) {
  const paths = annotationOutputPaths(props.request, props.mode);
  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <Section
        className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        contentClassName="flex min-h-0 flex-1 flex-col gap-2"
        title="Tool"
      >
        {props.mode === "segmentation" ? (
          <>
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Button
                className="h-full justify-center"
                type="button"
                variant={props.tool === "brush" ? "default" : "outline"}
                onClick={() => props.onToolChange("brush")}
              >
                Brush
              </Button>
              <Button
                className="h-full justify-center"
                type="button"
                variant={props.tool === "brush-erase" ? "default" : "outline"}
                onClick={() => props.onToolChange("brush-erase")}
              >
                Brush Erase
              </Button>
              <Button
                className="h-full justify-center"
                type="button"
                variant={props.tool === "lasso" ? "default" : "outline"}
                onClick={() => props.onToolChange("lasso")}
              >
                Lasso
              </Button>
              <Button
                className="h-full justify-center"
                type="button"
                variant={props.tool === "lasso-erase" ? "default" : "outline"}
                onClick={() => props.onToolChange("lasso-erase")}
              >
                Lasso Erase
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
            Classification
          </div>
        )}
      </Section>
      <Section
        className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        contentClassName="flex min-h-0 flex-col gap-2"
        title="Save"
      >
        <div className={cn("grid min-w-0 gap-2", paths.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {paths.map((path) => (
            <ReadonlyPathField key={path} aria-label={`Output path ${path}`} value={path} />
          ))}
        </div>
        <Button
          className="w-full justify-center"
          disabled={!props.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onSave}
        >
          {props.saving ? "Saving" : "Save"}
        </Button>
      </Section>
    </div>
  );
}
