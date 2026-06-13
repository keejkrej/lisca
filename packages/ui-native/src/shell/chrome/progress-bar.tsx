import { Progress as UiProgress } from "../../../components/ui/progress";
import { cn } from "../../../lib/utils";

export function ShellProgress(props: { value: number; className?: string }) {
  return (
    <UiProgress
      className={cn("h-2", props.className)}
      indicatorClassName="bg-primary"
      value={props.value}
    />
  );
}
