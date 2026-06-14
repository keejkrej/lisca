import { cn } from "@/lib/utils";
import { Platform, TextInput, type StyleProp, type TextStyle } from "react-native";

const inputChromeClassName =
  "font-sans w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-sm shadow-black/5 dark:bg-input/30";

const defaultInputChromeClassName = cn(inputChromeClassName, "h-8.5");

/** iOS TextInput ignores parent flex centering — size the field and pad the text directly. */
const iosInputTextStyle: TextStyle = {
  height: 32,
  fontSize: 14,
  lineHeight: 14,
  paddingTop: 13,
  paddingBottom: 5,
  paddingHorizontal: 0,
  margin: 0,
};

const inputHeightStyle: StyleProp<TextStyle> = Platform.select({
  web: { minHeight: 30 },
  android: {
    height: 34,
    fontSize: 14,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  default: { minHeight: 34 },
});

function Input({
  className,
  style,
  editable,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  const disabled = editable === false;

  if (Platform.OS === "ios") {
    return (
      <TextInput
        className={cn(
          inputChromeClassName,
          "h-8 text-foreground leading-none placeholder:text-muted-foreground/50",
          disabled && "pointer-events-none opacity-64",
          className,
        )}
        editable={editable}
        style={[iosInputTextStyle, style]}
        {...props}
      />
    );
  }

  return (
    <TextInput
      className={cn(
        defaultInputChromeClassName,
        "text-foreground",
        Platform.select({
          web: "flex flex-row items-center leading-8.5 sm:h-7.5 sm:leading-7.5",
          default: "h-8.5",
        }),
        disabled &&
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
      editable={editable}
      style={[inputHeightStyle, style]}
      {...props}
    />
  );
}

export { Input };
