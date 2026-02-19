import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  {
    variants: {
      variant: {
        neutral: "border-white/10 bg-white/6 text-white/80",
        success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
        danger: "border-red-400/20 bg-red-400/10 text-red-200",
        info: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };

