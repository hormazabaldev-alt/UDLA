"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertTriangle, FileSpreadsheet, Plus, Replace, Upload } from "lucide-react";

import { parseXlsxFile } from "@/lib/data-processing/parse-xlsx";
import type { ParseResult } from "@/lib/data-processing/types";
import { loadAdminKey, persistAdminKey } from "@/lib/persistence/admin-key";
import { cn } from "@/lib/utils/cn";
import { formatInt } from "@/lib/utils/format";
import { normalizeRut } from "@/lib/utils/rut";
import { isInteresaViene } from "@/lib/utils/interesa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/features/dashboard/hooks/useData";
import { PreviewGrid } from "@/features/dashboard/components/upload/preview-grid";

function IssueList({ result }: { result: Extract<ParseResult, { ok: false }> }) {
  const items = result.issues.slice(0, 10);
  return (
    <div className="rounded-xl border border-red-400/15 bg-red-400/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-red-200">
        <AlertTriangle className="size-4" />
        {`Se detectaron ${result.issues.length} problema(s).`}
      </div>
      <ul className="mt-2 space-y-1 text-xs text-white/70">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-white/40">
              {i.rowIndex !== undefined ? `Fila ${i.rowIndex + 2}` : "Estructura"}
            </span>
            <span className="text-white/30">·</span>
            <span>{i.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type UploadMode = "replace" | "append";

const BASE_OPTIONS = ["Inbound", "Stock", "Lead"] as const;
type BaseOption = (typeof BASE_OPTIONS)[number];

function toBaseOption(value: string | null | undefined): BaseOption | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  const found = BASE_OPTIONS.find((b) => b.toLowerCase() === v);
  return found ?? null;
}

function basesInRows(rows: { tipoBase: string }[]): BaseOption[] {
  const set = new Set<BaseOption>();
  for (const r of rows) {
    const opt = toBaseOption(r.tipoBase);
    if (opt) set.add(opt);
  }
  return Array.from(set.values());
}

export function DataUploadDialog({ defaultMode, triggerLabel, triggerIcon }: {
  defaultMode?: UploadMode;
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
}) {
  const { meta, replaceDataset, refreshDataset } = useData();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<UploadMode>(defaultMode || "replace");
  const [replaceBases, setReplaceBases] = useState<BaseOption[]>([...BASE_OPTIONS]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<{ file: File; result: ParseResult }[]>([]);
  const [adminKey, setAdminKey] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const uploadLockRef = useRef(false);

  useEffect(() => {
    setAdminKey(loadAdminKey());
  }, []);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (accepted.length === 0) return;
    setSelectedFiles(accepted);
    setParsing(true);
    setUploadError(null);
    setResults([]);
    try {
      const parsed: { file: File; result: ParseResult }[] = [];
      for (const file of accepted) {
        const result = await parseXlsxFile(file);
        parsed.push({ file, result });
      }
      setResults(parsed);
    } finally {
      setParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: true,
  });

  const allValid = results.length > 0 && results.every(r => r.result.ok);
  const totalRows = results.reduce(
    (sum, r) => sum + (r.result.ok ? r.result.dataset.rows.length : 0), 0
  );
  const canUpload =
    allValid &&
    !parsing &&
    !uploading &&
    adminKey.trim().length > 0 &&
    (mode !== "replace" || replaceBases.length > 0);

  const vieneStats = useMemo(() => {
    return results.map((r) => {
      if (!r.result.ok) return null;
      let vieneRows = 0;
      const ruts = new Set<string>();
      for (const row of r.result.dataset.rows) {
        if (!isInteresaViene(row.interesa)) continue;
        vieneRows++;
        const rut = normalizeRut(row.rutBase);
        if (rut) ruts.add(rut);
      }
      return { vieneRows, uniqueRutViene: ruts.size };
    });
  }, [results]);

  const handleUpload = async () => {
    if (!allValid) return;
    if (uploadLockRef.current) return;
    uploadLockRef.current = true;
    setUploading(true);
    setUploadError(null);

    const postFile = async (file: File, opts: { mode: UploadMode; replaceBasesHeader?: string; progressLabel: string }) => {
      setUploadProgress(opts.progressLabel);
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/snapshot", {
        method: "POST",
        headers: {
          "x-admin-key": adminKey.trim(),
          "x-upload-mode": opts.mode,
          ...(opts.replaceBasesHeader ? { "x-replace-bases": opts.replaceBasesHeader } : {}),
        },
        body: form,
      });
      return res;
    };

    try {
      const uploadResults = results
        .filter((r): r is { file: File; result: Extract<ParseResult, { ok: true }> } => r.result.ok);

      // Vercel has strict request payload limits; uploading multiple XLSX files in a single request can hit 413.
      // Upload sequentially per file to keep payload small and stable.
      if (mode === "append") {
        for (let i = 0; i < uploadResults.length; i++) {
          const file = uploadResults[i]!.file;
          const res = await postFile(file, {
            mode: "append",
            progressLabel: `Subiendo ${i + 1}/${uploadResults.length}: ${file.name}...`,
          });
          if (!res.ok) {
            const contentType = res.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
              const body = await res.json().catch(() => null);
              setUploadError(`(${res.status}) ${body?.error ?? JSON.stringify(body) ?? "Error desconocido"}`);
            } else {
              const text = await res.text().catch(() => "");
              setUploadError(`(${res.status}) ${text.trim().slice(0, 300) || "Error desconocido"}`);
            }
            return;
          }
        }
      } else {
        // Replace selected bases, but upload per file to avoid 413 and to keep replacement safe.
        const filesByBase = new Map<BaseOption, File[]>();
        for (const { file, result } of uploadResults) {
          const bases = basesInRows(result.dataset.rows as unknown as { tipoBase: string }[]);
          if (bases.length !== 1) {
            setUploadError(
              `El archivo ${file.name} contiene múltiples Tipo Base (${bases.join(", ") || "N/A"}). Para reemplazo parcial, cada archivo debe traer una sola base (Inbound/Stock/Lead).`,
            );
            return;
          }
          const base = bases[0]!;
          if (!replaceBases.includes(base)) {
            setUploadError(
              `El archivo ${file.name} es de base ${base} pero no está seleccionada para reemplazo.`,
            );
            return;
          }
          const curr = filesByBase.get(base) ?? [];
          curr.push(file);
          filesByBase.set(base, curr);
        }

        for (const b of replaceBases) {
          const files = filesByBase.get(b) ?? [];
          if (files.length === 0) {
            setUploadError(`Falta archivo para la base seleccionada: ${b}.`);
            return;
          }
        }

        const basesToProcess = replaceBases.slice().sort((a, b) => a.localeCompare(b, "es"));
        let step = 0;
        const totalSteps = basesToProcess.reduce((sum, b) => sum + (filesByBase.get(b)?.length ?? 0), 0);

        for (const base of basesToProcess) {
          const files = filesByBase.get(base)!;
          // First file does the replacement for that base.
          step++;
          const first = files[0]!;
          let res = await postFile(first, {
            mode: "replace",
            replaceBasesHeader: base,
            progressLabel: `Reemplazando ${base} (${step}/${totalSteps}): ${first.name}...`,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            setUploadError(`(${res.status}) ${body?.error ?? JSON.stringify(body) ?? "Error desconocido"}`);
            return;
          }

          // Remaining files append (still deduped server-side).
          for (let j = 1; j < files.length; j++) {
            step++;
            const f = files[j]!;
            res = await postFile(f, {
              mode: "append",
              progressLabel: `Agregando ${base} (${step}/${totalSteps}): ${f.name}...`,
            });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              setUploadError(`(${res.status}) ${body?.error ?? JSON.stringify(body) ?? "Error desconocido"}`);
              return;
            }
          }
        }
      }

      setUploadProgress(null);
      await refreshDataset();
      setOpen(false);
      setResults([]);
      setSelectedFiles([]);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      uploadLockRef.current = false;
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setOpen(true);
          setResults([]);
          setSelectedFiles([]);
          setUploadError(null);
          if (defaultMode) setMode(defaultMode);
          setReplaceBases([...BASE_OPTIONS]);
        }}
        className="w-full justify-start gap-2"
      >
        {triggerIcon || <Upload className="size-4" />}
        {triggerLabel || "Cargar Excel"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {mode === "append" ? "Agregar más bases" : "Reemplazar datos"}
            </DialogTitle>
            <DialogDescription>
              {mode === "append"
                ? "Los nuevos datos se agregarán a los existentes."
                : "Los datos actuales serán reemplazados completamente."}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-2" />

          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === "replace" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("replace")}
              className="flex-1"
            >
              <Replace className="size-4 mr-1" /> Reemplazar
            </Button>
            <Button
              variant={mode === "append" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("append")}
              className="flex-1"
            >
              <Plus className="size-4 mr-1" /> Agregar
            </Button>
          </div>

          {/* Replace base selector */}
          {mode === "replace" ? (
            <div className="rounded-xl border border-white/10 bg-white/3 p-3">
              <div className="text-[11px] font-medium text-white/55">
                ¿Qué base quieres reemplazar?
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {BASE_OPTIONS.map((b) => {
                  const active = replaceBases.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setReplaceBases((curr) => {
                          if (curr.includes(b)) return curr.filter((x) => x !== b);
                          return [...curr, b];
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition border"
                      style={{
                        backgroundColor: active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
                        borderColor: active ? "#00d4ff" : "rgba(255,255,255,0.08)",
                        color: active ? "#00d4ff" : "rgba(255,255,255,0.55)",
                      }}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 text-[10px] text-white/40">
                Sube archivos que contengan solo estas bases; si no, el servidor lo rechazará para evitar pisar datos.
              </div>
            </div>
          ) : null}

          {/* Admin Key */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-3">
            <div className="text-[11px] font-medium text-white/55">Clave de carga</div>
            <Input
              value={adminKey}
              onChange={(e) => {
                setAdminKey(e.target.value);
                persistAdminKey(e.target.value);
              }}
              placeholder="admin123"
              className="mt-1 h-8"
            />
            <div className="mt-1 text-[10px] text-white/40">
              Se guarda en localStorage.
            </div>
          </div>

          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              "group flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/3 px-4 py-4 text-center transition hover:bg-white/5",
              isDragActive ? "border-cyan-400/40 bg-cyan-400/5" : null,
            )}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="size-5 text-cyan-200/90 mb-1" />
            <div className="text-sm font-medium">
              Arrastra tus XLSX aquí o haz click
            </div>
            <div className="text-xs text-white/50 mt-1">
              Puedes seleccionar <strong>múltiples archivos</strong>. Todos deben tener la misma estructura.
            </div>
          </div>

          {/* File Results */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {results.map(({ file, result }, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/3 border border-white/10">
                  <FileSpreadsheet className="size-4 text-cyan-300/80 flex-shrink-0" />
                  <span className="truncate flex-1 text-white/80">{file.name}</span>
                  {parsing ? (
                    <Badge variant="neutral">Procesando…</Badge>
                  ) : result.ok ? (
                    <>
                      <Badge variant="success">{formatInt(result.dataset.rows.length)} filas</Badge>
                      <Badge variant="neutral">
                        Viene: {formatInt(vieneStats[idx]?.vieneRows ?? 0)}
                      </Badge>
                      <Badge variant="neutral">
                        RUT Viene: {formatInt(vieneStats[idx]?.uniqueRutViene ?? 0)}
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="danger">Error</Badge>
                  )}
                </div>
              ))}
              {allValid && (
                <div className="text-xs text-white/50 text-right">
                  Total: <strong className="text-white/80">{formatInt(totalRows)}</strong> filas
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {results.some(r => !r.result.ok) &&
            results.filter(r => !r.result.ok).map((r, i) => (
              <IssueList key={i} result={r.result as Extract<ParseResult, { ok: false }>} />
            ))
          }

          {uploadError && (
            <div className="rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs text-red-200">
              {uploadError}
            </div>
          )}

          {/* Current Data Info */}
          {meta && (
            <div className="text-xs text-white/45 p-2 rounded-lg bg-white/3 border border-white/10">
              Datos actuales: <strong>{meta.sourceFileName}</strong> · {formatInt(meta.rowCount)} filas ·
              Importado {new Date(meta.importedAtISO).toLocaleString("es-CL")}
            </div>
          )}

          {/* Upload Button */}
          <Button
            className="w-full"
            disabled={!canUpload}
            onClick={handleUpload}
          >
            {uploading
              ? uploadProgress || "Subiendo…"
              : mode === "append"
                ? `Agregar ${formatInt(totalRows)} filas`
                : `Reemplazar ${replaceBases.join(", ")} con ${formatInt(totalRows)} filas`
            }
          </Button>

          {/* Preview */}
          {results.length === 1 && results[0]!.result.preview?.length ? (
            <div className="space-y-1">
              <div className="text-xs text-white/70 font-medium">Preview</div>
              <PreviewGrid rows={results[0]!.result.preview} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
