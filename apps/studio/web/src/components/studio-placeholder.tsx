export function StudioPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center p-8 text-center">
      <h1 className="font-semibold text-2xl">{title}</h1>
      <p className="mt-2 max-w-md text-muted-foreground text-sm">
        This Studio route is reserved for the next porting pass.
      </p>
    </div>
  );
}
