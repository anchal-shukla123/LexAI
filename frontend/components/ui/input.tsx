import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      suppressHydrationWarning
      className={cn(
        "flex h-12 w-full rounded-lg border border-[#2C3632] bg-[#121817] px-4 py-3 text-sm text-[#F5F5EF] ring-offset-background transition duration-150 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#7E8A86] hover:border-[#D9B76E]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7C957] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
