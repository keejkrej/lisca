import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Platform, Pressable, type ViewStyle } from "react-native";

const buttonVariants = cva(
  cn(
    "group shrink-0 flex-row items-center justify-center gap-2 rounded-lg border font-medium",
    Platform.select({
      web: "inline-flex focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      default: "self-start",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          "border-primary bg-primary active:bg-primary/90 shadow-sm shadow-black/5",
          Platform.select({ web: "hover:bg-primary/90" }),
        ),
        destructive: cn(
          "border-destructive bg-destructive active:bg-destructive/90 dark:bg-destructive/60 shadow-sm shadow-black/5",
          Platform.select({
            web: "hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          }),
        ),
        outline: cn(
          "border-input bg-popover active:bg-accent/50 dark:bg-input/30 dark:border-input dark:active:bg-input/64 border shadow-sm shadow-black/5",
          Platform.select({
            web: "hover:bg-accent/50 dark:hover:bg-input/64",
          }),
        ),
        secondary: cn(
          "border-transparent bg-secondary active:bg-secondary/80 shadow-sm shadow-black/5",
          Platform.select({ web: "hover:bg-secondary/90" }),
        ),
        ghost: cn(
          "border-transparent active:bg-accent dark:active:bg-accent/50",
          Platform.select({ web: "hover:bg-accent dark:hover:bg-accent/50" }),
        ),
        link: "border-transparent",
      },
      size: {
        default: cn("h-9 px-3 sm:h-8", Platform.select({ web: "has-[>svg]:px-3" })),
        sm: cn("h-8 gap-1.5 px-2.5 sm:h-7", Platform.select({ web: "px-[9px]" })),
        lg: cn("h-10 px-3.5 sm:h-9", Platform.select({ web: "has-[>svg]:px-4" })),
        xs: cn("h-7 gap-1 rounded-md px-2 sm:h-6", Platform.select({ web: "has-[>svg]:px-1.5" })),
        icon: "h-9 w-9 sm:h-8 sm:w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const buttonTextVariants = cva(
  cn(
    "text-foreground text-sm font-medium",
    Platform.select({ web: "pointer-events-none transition-colors" }),
  ),
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-white",
        outline: cn(
          "group-active:text-accent-foreground",
          Platform.select({ web: "group-hover:text-accent-foreground" }),
        ),
        secondary: "text-secondary-foreground",
        ghost: "group-active:text-accent-foreground",
        link: cn(
          "text-primary group-active:underline",
          Platform.select({ web: "underline-offset-4 hover:underline group-hover:underline" }),
        ),
      },
      size: {
        default: "",
        sm: "",
        lg: "",
        xs: "text-xs",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant,
  size,
  disabled,
  accessibilityState,
  style,
  ...props
}: ButtonProps) {
  const disabledStyle: ViewStyle | undefined = disabled
    ? { opacity: 0.64, ...(Platform.OS === "web" ? { pointerEvents: "none" as const } : null) }
    : undefined;

  const mergedStyle =
    typeof style === "function"
      ? (state: Parameters<NonNullable<typeof style>>[0]) => [disabledStyle, style(state)]
      : [disabledStyle, style];

  const variantKey = `${variant ?? "default"}-${size ?? "default"}`;

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        key={variantKey}
        accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
        className={cn(
          disabled && Platform.OS !== "web" && "pointer-events-none opacity-64",
          buttonVariants({ variant, size }),
          className,
        )}
        disabled={disabled}
        role="button"
        style={mergedStyle}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
