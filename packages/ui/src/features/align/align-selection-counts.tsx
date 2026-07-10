import { StatTile } from "../../shell/chrome/stat-tile";

export function AlignSelectionCounts(props: { included: number; excluded: number }) {
  return (
    <div class="grid grid-cols-2 gap-2">
      <StatTile class="text-center" label="Included cells" value={props.included} />
      <StatTile class="text-center" label="Excluded cells" value={props.excluded} />
    </div>
  );
}