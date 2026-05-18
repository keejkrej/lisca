export function OutputPathField({ value }: { value: string }) {
  return (
    <div
      aria-label={`Output path ${value}`}
      className="min-w-0 truncate rounded-md border border-border bg-muted/20 px-2 py-1.5 font-mono text-xs text-foreground"
      title={value}
    >
      {value}
    </div>
  );
}
