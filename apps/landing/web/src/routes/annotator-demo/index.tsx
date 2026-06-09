import { AnnotatorDemo } from "@lisca/annotator-demo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/annotator-demo/")({
  component: AnnotatorDemoPage,
});

function AnnotatorDemoPage() {
  return (
    <div className="h-dvh">
      <AnnotatorDemo />
    </div>
  );
}
