export type DirtySelectionGuard = (
  dirty: boolean,
  selectionChanging: boolean,
) => boolean | Promise<boolean>;

export async function runSelectionChange(
  guard: boolean | Promise<boolean>,
  fn: () => void,
): Promise<boolean> {
  const allowed = await Promise.resolve(guard);
  if (!allowed) return false;
  fn();
  return true;
}
