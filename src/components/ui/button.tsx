import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-cyan-500/90 to-blue-600/90 text-white shadow-[0_10px_30px_-12px_rgba(34,211,238,0.65)] hover:from-cyan-500 hover:to-blue-600",
        secondary:
          "bg-white/6 text-white hover:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        ghost: "bg-transparent text-white hover:bg-white/6",
        destructive:
          "bg-red-500/90 text-white hover:bg-red-500 shadow-[0_12px_30px_-16px_rgba(239,68,68,0.6)]",
        outline:
          "border border-white/10 bg-transparent hover:bg-white/5 text-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

