import { View } from "react-native";

import { StatTile } from "../../shell/chrome/stat-tile";

export function AlignSelectionCounts(props: { included: number; excluded: number }) {
  return (
    <View className="flex-row gap-2">
      <StatTile centered label="Included cells" value={props.included} />
      <StatTile centered label="Excluded cells" value={props.excluded} />
    </View>
  );
}
