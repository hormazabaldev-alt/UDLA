import * as React from "react";

import { cn } from "@/lib/utils/cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-sm text-white placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition focus-visible:border-cyan-400/40 focus-visible:ring-2 focus-visible:ring-cyan-400/30",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

