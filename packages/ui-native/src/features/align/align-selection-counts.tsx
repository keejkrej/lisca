import { View } from "react-native";

import { StatTile } from "../../shell/chrome/stat-tile";

export function AlignSelectionCounts(props: { included: number; excluded: number }) {
  return (
    <View className="w-full flex-row gap-2">
      <StatTile centered className="min-w-0 flex-1" label="Included cells" value={props.included} />
      <StatTile centered className="min-w-0 flex-1" label="Excluded cells" value={props.excluded} />
    </View>
  );
}
