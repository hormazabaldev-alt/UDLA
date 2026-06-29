"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatInt } from "@/lib/utils/format";
import { loadAdminKey, persistAdminKey } from "@/lib/persistence/admin-key";
import { Input } from "@/components/ui/input";

type UploadPhase =
  | { type: "idle" }
  | { type: "uploading"; message: string; pct: number }
  | { type: "completed"; rows: number }
  | { type: "error"; message: string };

export function DiplomadoUploadPanel({ onDone }: { onDone: (opts?: { force?: boolean }) => void | Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [adminKey, setAdminKey] = useState<string>(() => {
    if (typeof window === "undefined") return "admin123";
    return loadAdminKey() || "admin123";
  });
  const [phase, setPhase] = useState<UploadPhase>({ type: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => { if (accepted[0]) { setFile(accepted[0]); setPhase({ type: "idle" }); } },
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
    multiple: false,
    maxFiles: 1,
  });

  const handleUpload = useCallback(async () => {
    if (!file) return;
    abortRef.current = new AbortController();

    setPhase({ type: "uploading", message: "Enviando archivo...", pct: 5 });

    const fd = new FormData();
    fd.append("file", file);

    let res: Response;
    try {
      res = await fetch("/api/snapshot-diplomado", {
        method: "POST",
        headers: { "x-admin-key": adminKey.trim() },
        body: fd,
        signal: abortRef.current.signal,
      });
    } catch (e) {
      setPhase({ type: "error", message: e instanceof Error ? e.message : "Error de red al enviar el archivo." });
      return;
    }

    if (!res.ok) {
      let msg = `Error HTTP ${res.status}`;
      try { const j = await res.json() as { error?: string }; msg = j.error ?? msg; } catch { /* ignore */ }
      setPhase({ type: "error", message: msg });
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { setPhase({ type: "error", message: "El servidor no devolvió un stream." }); return; }

    const dec = new TextDecoder();
    let buf = "";
    let rows = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let msg: Record<string, unknown>;
          try { msg = JSON.parse(line) as Record<string, unknown>; } catch { continue; }

          if (msg.type === "progress") {
            const total = Number(msg.totalRows ?? 0);
            const processed = Number(msg.processedRows ?? 0);
            const pct = total > 0 ? Math.round((processed / total) * 85) + 10 : 15;
            const stage = String(msg.stage ?? "");
            const label = stage === "persisting" ? "Guardando en la nube..." : stage === "analyzing" ? "Analizando columnas..." : total > 0 ? `Procesando ${formatInt(processed)} / ${formatInt(total)} filas...` : "Procesando...";
            setPhase({ type: "uploading", message: label, pct });
          } else if (msg.type === "validation_error") {
            const issues = (msg.issues as Array<{ message: string }> | undefined) ?? [];
            setPhase({ type: "error", message: `Columnas faltantes: ${issues.slice(0, 3).map((i) => i.message).join("; ")}` });
            return;
          } else if (msg.type === "fatal_error") {
            setPhase({ type: "error", message: String(msg.error ?? "Error desconocido.") });
            return;
          } else if (msg.type === "completed") {
            rows = Number(msg.totalRows ?? 0);
            setPhase({ type: "uploading", message: "Finalizando...", pct: 98 });
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") {
        setPhase({ type: "error", message: e instanceof Error ? e.message : "Error leyendo la respuesta." });
        return;
      }
    }

    setPhase({ type: "completed", rows });
    await onDone({ force: true });
  }, [file, adminKey, onDone]);

  const busy = phase.type === "uploading";

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Admin key */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#9090b0]">Clave de administrador</label>
        <Input
          value={adminKey}
          onChange={(e) => { setAdminKey(e.target.value); persistAdminKey(e.target.value); }}
          placeholder="admin123"
          type="password"
          className="h-9 border-[#3d3d5c] bg-[#1a1a2e] text-sm text-[#e8e8f0]"
          disabled={busy}
        />
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition",
          isDragActive ? "border-[#e8620a] bg-[#e8620a]/10" : "border-[#3d3d5c] bg-[#1a1a2e] hover:border-[#e8620a]/60",
          busy ? "pointer-events-none opacity-60" : "",
        )}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet className={cn("size-8", file ? "text-[#e8620a]" : "text-[#5050a0]")} />
        {file ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#e8e8f0]">{file.name}</p>
            <p className="text-xs text-[#9090b0]">{(file.size / 1024).toFixed(0)} KB — haz clic para cambiar</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-[#e8e8f0]">Arrastra el Excel aquí o haz clic</p>
            <p className="text-xs text-[#9090b0]">Archivos .xlsx o .csv</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {phase.type === "uploading" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#9090b0]">
            <span className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />{phase.message}</span>
            <span className="font-bold text-[#e8620a]">{phase.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#2d2d44]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#e8620a] to-[#ff9444] transition-all duration-500 ease-out"
              style={{ width: `${phase.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed */}
      {phase.type === "completed" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" />
          {formatInt(phase.rows)} filas cargadas correctamente
        </div>
      )}

      {/* Error */}
      {phase.type === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{phase.message}</span>
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        disabled={!file || busy}
        onClick={handleUpload}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8620a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c04e08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {busy ? "Cargando..." : "Cargar Excel Diplomados"}
      </button>
    </div>
  );
}
