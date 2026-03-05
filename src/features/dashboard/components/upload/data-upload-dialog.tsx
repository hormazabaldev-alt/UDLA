"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";

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

export function DataUploadDialog({ triggerLabel, triggerIcon }: {
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
}) {
  const { meta, refreshDataset } = useData();

  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const uploadLockRef = useRef(false);

  useEffect(() => {
    setAdminKey(loadAdminKey());
  }, []);

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0] ?? null;
    if (!file) return;
    setSelectedFile(file);
    setParsing(true);
    setUploadError(null);
    setResult(null);
    try {
      const parsed = await parseXlsxFile(file);
      setResult(parsed);
    } finally {
      setParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  });

  const allValid = !!result && result.ok;
  const totalRows = allValid ? result.dataset.rows.length : 0;
  const canUpload =
    allValid &&
    !parsing &&
    !uploading &&
    adminKey.trim().length > 0;

  const vieneStats = useMemo(() => {
    if (!result?.ok) return null;
    let vieneRows = 0;
    const ruts = new Set<string>();
    for (const row of result.dataset.rows) {
      if (!isInteresaViene(row.interesa)) continue;
      vieneRows++;
      const rut = normalizeRut(row.rutBase);
      if (rut) ruts.add(rut);
    }
    return { vieneRows, uniqueRutViene: ruts.size };
  }, [result]);

  const handleUpload = async () => {
    if (!allValid || !selectedFile) return;
    if (uploadLockRef.current) return;
    uploadLockRef.current = true;
    setUploading(true);
    setUploadError(null);

    try {
      setUploadProgress(`Subiendo: ${selectedFile.name}...`);
      const form = new FormData();
      form.set("file", selectedFile);
      const res = await fetch("/api/snapshot", {
        method: "POST",
        headers: {
          "x-admin-key": adminKey.trim(),
        },
        body: form,
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

      setUploadProgress(null);
      await refreshDataset();
      setOpen(false);
      setResult(null);
      setSelectedFile(null);
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
          setResult(null);
          setSelectedFile(null);
          setUploadError(null);
        }}
        className="w-full justify-start gap-2"
      >
        {triggerIcon || <Upload className="size-4" />}
        {triggerLabel || "Reemplazar dataset"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Reemplazar dataset
            </DialogTitle>
            <DialogDescription>
              Se cargará un único archivo Excel y se reemplazará completamente la data actual.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-2" />

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
              Arrastra tu XLSX aquí o haz click
            </div>
            <div className="text-xs text-white/50 mt-1">
              Solo se permite <strong>1 archivo</strong>; se reemplazará el dataset completo.
            </div>
          </div>

          {/* File Results */}
          {result && selectedFile && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/3 border border-white/10">
                <FileSpreadsheet className="size-4 text-cyan-300/80 flex-shrink-0" />
                <span className="truncate flex-1 text-white/80">{selectedFile.name}</span>
                {parsing ? (
                  <Badge variant="neutral">Procesando…</Badge>
                ) : result.ok ? (
                  <>
                    <Badge variant="success">{formatInt(result.dataset.rows.length)} filas</Badge>
                    <Badge variant="neutral">
                      Viene: {formatInt(vieneStats?.vieneRows ?? 0)}
                    </Badge>
                    <Badge variant="neutral">
                      RUT Viene: {formatInt(vieneStats?.uniqueRutViene ?? 0)}
                    </Badge>
                  </>
                ) : (
                  <Badge variant="danger">Error</Badge>
                )}
              </div>
              {allValid && (
                <div className="text-xs text-white/50 text-right">
                  Total: <strong className="text-white/80">{formatInt(totalRows)}</strong> filas
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {result && !result.ok ? (
            <IssueList result={result as Extract<ParseResult, { ok: false }>} />
          ) : null}

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
              : `Reemplazar dataset con ${formatInt(totalRows)} filas`
            }
          </Button>

          {/* Preview */}
          {result?.preview?.length ? (
            <div className="space-y-1">
              <div className="text-xs text-white/70 font-medium">Preview</div>
              <PreviewGrid rows={result.preview} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
