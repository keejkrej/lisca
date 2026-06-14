import { View } from "react-native";

import { StatTile } from "../../shell/chrome/stat-tile";

export function AlignSelectionCounts(props: { included: number; excluded: number }) {
  return (
    <View className="w-full flex-row gap-2">
      <View className="min-w-0 flex-1">
        <StatTile centered label="Included cells" value={props.included} />
      </View>
      <View className="min-w-0 flex-1">
        <StatTile centered label="Excluded cells" value={props.excluded} />
      </View>
    </View>
  );
}
