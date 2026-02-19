"use client";

import { cn } from "@/lib/utils/cn";
import { GripVertical } from "lucide-react";

interface WidgetCardProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    headerAction?: React.ReactNode;
}

export function WidgetCard({
    title,
    icon,
    children,
    className,
    headerAction
}: WidgetCardProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl premium-card transition-all hover:border-[var(--color-neon-cyan)]/30 group",
                className
            )}
        >
            <div className="flex items-center justify-between border-b border-[var(--glass-border)] bg-black/20 px-4 py-3">
                <div className="flex items-center gap-2">
                    {icon && <span className="text-[var(--color-neon-cyan)]">{icon}</span>}
                    <h3 className="text-sm font-semibold tracking-wide text-white/90 font-[family-name:var(--font-space-grotesk)]">
                        {title}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    {headerAction}
                    {/* Drag Handle Indicator (visual only, actual drag is on the whole card or specialized handle) */}
                    <GripVertical className="size-4 text-white/20 opacity-0 transition-opacity group-hover:opacity-100 cursor-grab" />
                </div>
            </div>

            <div className="flex-1 p-4 relative">
                {/* Glow effect */}
                <div className="absolute top-0 left-1/2 -px-10 h-[1px] w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--color-neon-cyan)]/20 to-transparent opacity-50" />

                {children}
            </div>
        </div>
    );
}
