export function AlignSelectionCounts(props: { included: number; excluded: number }) {
  return (
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Included patterns</span>
        <span class="font-medium tabular-nums">{props.included}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">Excluded patterns</span>
        <span class="font-medium tabular-nums">{props.excluded}</span>
      </div>
    </div>
  );
}
