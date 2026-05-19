import { ReadonlyPathField } from "@lisca/ui";

export function OutputPathField({ value }: { value: string }) {
  return <ReadonlyPathField aria-label={`Output path ${value}`} value={value} />;
}
