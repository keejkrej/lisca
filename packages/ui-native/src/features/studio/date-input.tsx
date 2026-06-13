import { Platform } from "react-native";

import { Input } from "../../../components/ui/input";

export function DateInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      placeholder={Platform.OS === "web" ? undefined : "YYYY-MM-DD"}
      {...(Platform.OS === "web" ? ({ type: "date" } as object) : {})}
      {...props}
    />
  );
}
