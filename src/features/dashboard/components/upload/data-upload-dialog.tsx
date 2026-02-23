"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertTriangle, FileSpreadsheet, Plus, Replace, Upload } from "lucide-react";

import { parseXlsxFile } from "@/lib/data-processing/parse-xlsx";
import type { ParseResult } from "@/lib/data-processing/types";
import { loadAdminKey, persistAdminKey } from "@/lib/persistence/admin-key";
import { cn } from "@/lib/utils/cn";
import { formatInt } from "@/lib/utils/format";
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

export function DataUploadDialog({ defaultMode, triggerLabel, triggerIcon }: {
  defaultMode?: UploadMode;
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
}) {
  const { meta, replaceDataset, refreshDataset } = useData();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<UploadMode>(defaultMode || "replace");
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
  const canUpload = allValid && !parsing && !uploading && adminKey.trim().length > 0;

  const handleUpload = async () => {
    if (!allValid) return;
    if (uploadLockRef.current) return;
    uploadLockRef.current = true;
    setUploading(true);
    setUploadError(null);

    try {
      setUploadProgress(
        results.length === 1
          ? `Subiendo: ${results[0]!.file.name}...`
          : `Subiendo y procesando ${results.length} archivos...`,
      );

      const form = new FormData();
      for (const { file } of results) {
        form.append("file", file);
      }
      const res = await fetch("/api/snapshot", {
        method: "POST",
        headers: {
          "x-admin-key": adminKey.trim(),
          "x-upload-mode": mode,
        },
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setUploadError(body?.error ?? "Error desconocido");
        return;
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
                    <Badge variant="success">{formatInt(result.dataset.rows.length)} filas</Badge>
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
                : `Reemplazar con ${formatInt(totalRows)} filas`
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
