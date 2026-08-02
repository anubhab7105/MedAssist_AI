import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-primary bg-[length:140%_100%] bg-left text-primary-foreground shadow-[0_10px_24px_-10px_rgba(47,111,237,0.55)] hover:bg-right hover:shadow-[0_14px_28px_-10px_rgba(47,111,237,0.65)] active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_10px_24px_-10px_rgba(14,168,139,0.5)] hover:bg-secondary/90 active:scale-[0.98]",
        outline:
          "border border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]",
        ghost: "text-foreground hover:bg-slate-100 active:scale-[0.98]",
        danger: "bg-danger text-danger-foreground hover:bg-danger/90 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
