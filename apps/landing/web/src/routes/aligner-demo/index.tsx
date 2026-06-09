import { AlignDemo } from "@lisca/aligner-demo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/aligner-demo/")({
  component: AlignerDemoPage,
});

function AlignerDemoPage() {
  return (
    <div className="h-dvh">
      <AlignDemo />
    </div>
  );
}
