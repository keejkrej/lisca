export function AlignSelectionCounts(props: { included: number; excluded: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
        <div className="text-muted-foreground text-xs">Included cells</div>
        <div className="mt-1 font-medium tabular-nums">{props.included}</div>
      </div>
      <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
        <div className="text-muted-foreground text-xs">Excluded cells</div>
        <div className="mt-1 font-medium tabular-nums">{props.excluded}</div>
      </div>
    </div>
  );
}
