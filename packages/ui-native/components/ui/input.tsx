import { cn } from "@/lib/utils";
import { Platform, TextInput, type StyleProp, type TextStyle } from "react-native";

const inputHeightStyle: StyleProp<TextStyle> = Platform.select({
  web: { minHeight: 30 },
  default: { minHeight: 34 },
});

function Input({
  className,
  style,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        "font-sans border-input bg-background text-foreground flex h-8.5 w-full min-w-0 flex-row items-center rounded-lg border px-3 text-sm leading-8.5 shadow-sm shadow-black/5 dark:bg-input/30 sm:h-7.5 sm:leading-7.5",
        props.editable === false &&
          cn(
            "pointer-events-none opacity-64",
            Platform.select({ web: "disabled:cursor-not-allowed" }),
          ),
        Platform.select({
          web: cn(
            "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow]",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          ),
          native: "placeholder:text-muted-foreground/50",
        }),
        className,
      )}
      style={[inputHeightStyle, style]}
      {...props}
    />
  );
}

export { Input };
