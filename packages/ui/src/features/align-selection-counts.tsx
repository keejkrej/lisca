import { StatTile } from "../shell/stat-tile";

export function AlignSelectionCounts(props: { included: number; excluded: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile label="Included cells" value={props.included} />
      <StatTile label="Excluded cells" value={props.excluded} />
    </div>
  );
}
