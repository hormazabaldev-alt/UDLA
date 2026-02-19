"use client";

import { useState } from "react";
import {
    LayoutDashboard,
    BarChart2,
    Settings,
    ChevronLeft,
    ChevronRight,
    PieChart,
    Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { AppShell } from "@/components/shell/app-shell";

interface DashboardShellProps {
    children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <AppShell className="flex h-screen max-h-screen overflow-hidden p-0">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 80 : 280 }}
                className={cn(
                    "relative z-20 hidden md:flex flex-col border-r border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-xl transition-all duration-300",
                )}
            >
                <div className="flex h-16 items-center justify-between px-4">
                    <AnimatePresence mode="wait">
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-xl font-bold tracking-tighter text-[var(--color-neon-cyan)] font-[family-name:var(--font-space-grotesk)]"
                            >
                                ALTIUS
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex size-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                <div className="flex-1 space-y-2 p-3">
                    <NavItem icon={LayoutDashboard} label="Overview" collapsed={collapsed} active />
                    <NavItem icon={BarChart2} label="Analytics" collapsed={collapsed} />
                    <NavItem icon={PieChart} label="Reports" collapsed={collapsed} />
                    <NavItem icon={Activity} label="Live View" collapsed={collapsed} />
                </div>

                <div className="p-3">
                    <NavItem icon={Settings} label="Settings" collapsed={collapsed} />
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent">
                <div className="relative min-h-full p-4 md:p-8">
                    {children}
                </div>
            </main>
        </AppShell>
    );
}

function NavItem({
    icon: Icon,
    label,
    collapsed,
    active
}: {
    icon: any;
    label: string;
    collapsed: boolean;
    active?: boolean;
}) {
    return (
        <button
            className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all",
                active
                    ? "bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] shadow-[0_0_15px_rgba(6,208,249,0.15)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
        >
            <Icon size={20} className={cn("shrink-0", active && "animate-pulse")} />
            <AnimatePresence>
                {!collapsed && (
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap font-medium"
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
}
