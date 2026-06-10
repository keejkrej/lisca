import { Spinner } from "../../components/ui/spinner";

export function RouteLoadingFallback() {
  return (
    <div className="flex h-full min-h-[12rem] items-center justify-center">
      <Spinner className="size-4" />
    </div>
  );
}
