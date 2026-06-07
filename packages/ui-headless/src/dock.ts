export type DockToolAction = {
  id: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onSelect: () => void;
};

export function dockToolLabel(label: string, index: number): string {
  return `${label} (${index + 1})`;
}
