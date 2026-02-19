"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertTriangle, FileSpreadsheet, RefreshCcw, Upload } from "lucide-react";

import { parseXlsxFile } from "@/lib/data-processing/parse-xlsx";
import type { ParseResult } from "@/lib/data-processing/types";
import { loadAdminKey, persistAdminKey } from "@/lib/persistence/admin-key";
import { cn } from "@/lib/utils/cn";
import { formatInt } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useData } from "@/features/dashboard/hooks/useData";
import { PreviewGrid } from "@/features/dashboard/components/upload/preview-grid";

function IssueList({ result }: { result: Extract<ParseResult, { ok: false }> }) {
  const items = result.issues.slice(0, 10);
  return (
    <div className="rounded-2xl border border-red-400/15 bg-red-400/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-red-200">
        <AlertTriangle className="size-4" />
        {`Se detectaron ${result.issues.length} problema(s).`}
        <span className="text-white/50">Corrige el Excel y vuelve a cargar.</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-white/70">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-white/40">
              {i.rowIndex !== undefined ? `Fila ${i.rowIndex + 2}` : "Estructura"}
            </span>
            <span className="text-white/30">·</span>
            <span className="text-white/60">{i.column ?? "—"}</span>
            <span className="text-white/30">·</span>
            <span>{i.message}</span>
          </li>
        ))}
        {result.issues.length > items.length ? (
          <li className="text-white/45">{`… +${result.issues.length - items.length} más`}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function DataUploadDialog() {
  const { meta, replaceDataset, dataset, refreshDataset } = useData();

  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setAdminKey(loadAdminKey());
  }, []);

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setSelectedFile(file);
    setParsing(true);
    setUploadError(null);
    try {
      const parsed = await parseXlsxFile(file);
      setResult(parsed);
    } finally {
      setParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
      },
      maxFiles: 1,
    });

  const rejectionText = useMemo(() => {
    const first = fileRejections[0];
    if (!first) return null;
    return first.errors[0]?.message ?? "Archivo no válido";
  }, [fileRejections]);

  const canReplace =
    result?.ok === true && !parsing && !uploading && adminKey.trim().length > 0;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(true);
            setResult(null);
            setSelectedFileName(null);
          }}
        >
          <Upload className="size-4" />
          Cargar Excel
        </Button>
        {dataset ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => void refreshDataset()}
                aria-label="Refrescar datos"
              >
                <RefreshCcw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refrescar desde Supabase</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

        <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reemplazar snapshot de datos</DialogTitle>
            <DialogDescription>
              Cada carga sobrescribe completamente los datos actuales (sin histórico).
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <div className="text-[11px] font-medium text-white/55">
                  Clave de carga (solo para reemplazar datos)
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={adminKey}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAdminKey(v);
                      persistAdminKey(v);
                    }}
                    placeholder="Pega tu DASHBOARD_ADMIN_KEY"
                  />
                </div>
                <div className="mt-2 text-xs text-white/45">
                  Se guarda en este navegador (localStorage). Compartir la URL no comparte la clave.
                </div>
              </div>

              <div
                {...getRootProps()}
                className={cn(
                  "group relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/3 px-5 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/5",
                  isDragActive ? "border-cyan-400/40 bg-cyan-400/5" : null,
                )}
              >
                <input {...getInputProps()} />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileSpreadsheet className="size-4 text-cyan-200/90" />
                  Arrastra tu XLSX aquí o haz click para seleccionar
                </div>
                <div className="mt-1 text-xs text-white/50">
                  Estructura fija. Validación automática + preview antes de aplicar.
                </div>
                {selectedFileName ? (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Badge variant="info">{selectedFileName}</Badge>
                    {parsing ? (
                      <Badge variant="neutral">Procesando…</Badge>
                    ) : result?.ok ? (
                      <Badge variant="success">OK</Badge>
                    ) : result ? (
                      <Badge variant="danger">Con errores</Badge>
                    ) : null}
                  </div>
                ) : null}
                {rejectionText ? (
                  <div className="mt-2 text-xs text-red-200">{rejectionText}</div>
                ) : null}
              </div>

              {uploadError ? (
                <div className="rounded-2xl border border-red-400/15 bg-red-400/5 p-3 text-xs text-red-200">
                  {uploadError}
                </div>
              ) : null}

              {result?.ok === false ? <IssueList result={result} /> : null}

              {result?.preview?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-white/70">
                      Preview (primeras filas)
                    </div>
                    {result.ok ? (
                      <div className="text-xs text-white/50">
                        {`${formatInt(result.dataset.rows.length)} filas normalizadas`}
                      </div>
                    ) : null}
                  </div>
                  <PreviewGrid rows={result.preview} />
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Card>
                <CardContent className="pt-5">
                  <div className="text-xs font-medium text-white/70">
                    Snapshot actual
                  </div>
                  {meta ? (
                    <div className="mt-2 space-y-1 text-xs text-white/55">
                      <div className="flex items-center justify-between gap-3">
                        <span>Archivo</span>
                        <span className="truncate text-white/80">
                          {meta.sourceFileName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Hoja</span>
                        <span className="text-white/80">{meta.sheetName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Filas</span>
                        <span className="text-white/80">
                          {formatInt(meta.rowCount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Importado</span>
                        <span className="text-white/80">
                          {new Date(meta.importedAtISO).toLocaleString("es-ES")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-white/45">
                      No hay datos cargados aún.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <div className="text-xs text-white/60">
                  Al aplicar, el dashboard se recalcula en tiempo real y se reemplaza el snapshot.
                </div>
                <Button
                  className="mt-3 w-full"
                  disabled={!canReplace}
                  onClick={async () => {
                    if (result?.ok !== true) return;
                    if (!selectedFile) {
                      setUploadError("No se encontró el archivo seleccionado.");
                      return;
                    }
                    setUploading(true);
                    setUploadError(null);
                    try {
                      const form = new FormData();
                      form.set("file", selectedFile);
                      const res = await fetch("/api/snapshot", {
                        method: "POST",
                        headers: { "x-admin-key": adminKey.trim() },
                        body: form,
                      });
                      if (!res.ok) {
                        const body = (await res.json().catch(() => null)) as
                          | (Partial<ParseResult> & { error?: string })
                          | null;
                        if (body && body.ok === false && Array.isArray(body.issues)) {
                          setResult(body as ParseResult);
                          setUploadError("El servidor rechazó el archivo por validación.");
                        } else {
                          setUploadError(
                            body?.error ?? "No se pudo reemplazar el snapshot.",
                          );
                        }
                        return;
                      }
                      await replaceDataset(result.dataset);
                      await refreshDataset();
                      setOpen(false);
                    } finally {
                      setUploading(false);
                    }
                  }}
                >
                  {uploading ? "Subiendo…" : "Reemplazar datos actuales"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
