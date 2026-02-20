"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Plus, Replace } from "lucide-react";
import { formatInt } from "@/lib/utils/format";

type LogEntry = {
    timestamp: string;
    fileName: string;
    sheetName: string;
    rowCount: number;
    mode: "replace" | "append";
    totalRowsAfter: number;
};

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/logs", { cache: "no-store" })
            .then(r => r.json())
            .then(data => setLogs(Array.isArray(data) ? data.reverse() : []))
            .catch(() => setLogs([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/"
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition"
                    >
                        <ArrowLeft className="size-4" />
                        Volver al Dashboard
                    </Link>
                </div>

                <h1 className="text-2xl font-bold tracking-tight mb-1">
                    Historial de Cargas
                </h1>
                <p className="text-sm text-white/50 mb-6">
                    Registro de todas las subidas de archivos Excel realizadas.
                </p>

                {/* Stats */}
                {!loading && logs.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg p-4">
                            <div className="text-2xl font-bold text-[#00d4ff]">{logs.length}</div>
                            <div className="text-xs text-white/50 mt-1">Total de cargas</div>
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg p-4">
                            <div className="text-2xl font-bold text-[#00d4ff]">
                                {formatInt(logs.reduce((sum, l) => sum + l.rowCount, 0))}
                            </div>
                            <div className="text-xs text-white/50 mt-1">Filas procesadas</div>
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg p-4">
                            <div className="text-2xl font-bold text-[#00d4ff]">
                                {formatInt(logs[0]?.totalRowsAfter || 0)}
                            </div>
                            <div className="text-xs text-white/50 mt-1">Filas actuales</div>
                        </div>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div className="text-center py-20 text-white/40">Cargando logs...</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 text-white/40">
                        <FileSpreadsheet className="size-12 mx-auto mb-3 opacity-30" />
                        No hay registros de cargas aún.
                    </div>
                ) : (
                    <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#1f1f1f] text-left text-xs text-white/50 uppercase">
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Archivo</th>
                                    <th className="px-4 py-3">Hoja</th>
                                    <th className="px-4 py-3 text-right">Filas</th>
                                    <th className="px-4 py-3">Modo</th>
                                    <th className="px-4 py-3 text-right">Total después</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, i) => (
                                    <tr key={i} className="border-b border-[#1f1f1f]/50 hover:bg-white/3 transition">
                                        <td className="px-4 py-3 text-white/80 whitespace-nowrap text-xs">
                                            {new Date(log.timestamp).toLocaleString("es-CL")}
                                        </td>
                                        <td className="px-4 py-3 text-white/90 font-medium truncate max-w-[200px]">
                                            {log.fileName}
                                        </td>
                                        <td className="px-4 py-3 text-white/60">{log.sheetName}</td>
                                        <td className="px-4 py-3 text-right text-[#00d4ff] font-medium">
                                            {formatInt(log.rowCount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.mode === "append" ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                                    <Plus className="size-3" /> Agregar
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                                    <Replace className="size-3" /> Reemplazar
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-white/70">
                                            {formatInt(log.totalRowsAfter)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
