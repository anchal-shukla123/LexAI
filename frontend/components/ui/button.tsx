import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#A7C957] text-[#0B0F0E] shadow-[0_10px_28px_rgba(167,201,87,0.18)] hover:bg-[#B8D86C]",
        secondary: "border border-[#2C3632] bg-[#1B2421] text-[#F5F5EF] hover:bg-[#151C19]",
        outline: "border border-[#2C3632] bg-transparent text-[#F5F5EF] hover:border-[#D9B76E]/60 hover:bg-[#151C19]",
        ghost: "text-[#A2AAA5] hover:bg-[#151C19] hover:text-[#F5F5EF]"
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4",
        lg: "h-14 px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
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
        suppressHydrationWarning
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
