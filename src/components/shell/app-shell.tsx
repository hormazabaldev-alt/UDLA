import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function AppShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-dvh bg-[#0b0f17] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_20%_0%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(900px_600px_at_80%_0%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(900px_600px_at_50%_100%,rgba(99,102,241,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_40%,rgba(255,255,255,0.01))]" />
      </div>
      <main className={cn("mx-auto w-full max-w-[1400px] px-5 py-6", className)}>
        {children}
      </main>
    </div>
  );
}

