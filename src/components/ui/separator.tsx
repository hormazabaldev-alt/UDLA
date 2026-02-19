import * as React from "react";

import { cn } from "@/lib/utils/cn";

function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="separator"
      className={cn("h-px w-full bg-white/8", className)}
      {...props}
    />
  );
}

export { Separator };

