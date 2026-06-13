import { SelectPicker } from "@lisca/ui-native";
import type { NavigationOption } from "@lisca/utils";

export function BasicInfoSelect<T extends string>(props: {
  value: T;
  options: NavigationOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <SelectPicker
      disabled={props.disabled}
      options={props.options}
      value={props.value}
      onChange={props.onChange}
    />
  );
}
