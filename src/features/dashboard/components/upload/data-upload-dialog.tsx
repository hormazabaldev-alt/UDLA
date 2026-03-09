"use client";

import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";

import type { ParseIssue } from "@/lib/data-processing/types";
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

const MAX_UPLOAD_RETRIES = 3;

type UploadState =
  | { type: "idle" }
  | {
    type: "progress";
    message: string;
    processedRows?: number;
    totalRows?: number;
    uploadedChunks?: number;
    totalChunks?: number;
  }
  | { type: "completed"; rowCount: number }
  | { type: "validation_error"; issues: ParseIssue[] }
  | { type: "fatal_error"; error: string };

async function uploadChunkWithRetry(
  url: string,
  adminKey: string,
  chunk: Blob,
  retries = MAX_UPLOAD_RETRIES,
) {
  let lastError = "Error desconocido";

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "x-admin-key": adminKey,
        "content-type": "application/octet-stream",
      },
      body: chunk,
    });

    if (res.ok) return;

    const text = await res.text().catch(() => "");
    lastError = text.trim() || `HTTP ${res.status}`;
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }

  throw new Error(lastError);
}

function IssueList({ issues }: { issues: ParseIssue[] }) {
  const items = issues.slice(0, 10);

  return (
    <div className="rounded-xl border border-red-400/15 bg-red-400/5 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-red-200">
        <AlertTriangle className="size-4" />
        {`Se detectaron ${issues.length} problema(s).`}
      </div>
      <ul className="mt-2 space-y-1 text-xs text-white/70">
        {items.map((issue, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-white/40">
              {issue.rowIndex !== undefined ? `Fila ${issue.rowIndex + 2}` : "Estructura"}
            </span>
            <span className="text-white/30">·</span>
            <span>{issue.message}</span>
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
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>({ type: "idle" });
  const uploadLockRef = useRef(false);

  useEffect(() => {
    setAdminKey(loadAdminKey());
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      const file = accepted[0] ?? null;
      if (!file) return;
      setSelectedFile(file);
      setUploadState({ type: "idle" });
    },
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  });

  const canUpload = !!selectedFile && !uploading && adminKey.trim().length > 0;

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (uploadLockRef.current) return;

    uploadLockRef.current = true;
    setUploading(true);
    setUploadState({
      type: "progress",
      message: `Subiendo ${selectedFile.name}...`,
    });

    let uploadId: string | null = null;

    try {
      const initRes = await fetch("/api/snapshot/uploads", {
        method: "POST",
        headers: {
          "x-admin-key": adminKey.trim(),
          "content-type": "application/json",
        },
        body: JSON.stringify({ fileName: selectedFile.name }),
      });

      if (!initRes.ok) {
        const contentType = initRes.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const body = await initRes.json().catch(() => null);
          setUploadState({
            type: "fatal_error",
            error: `(${initRes.status}) ${body?.error ?? JSON.stringify(body) ?? "Error desconocido"}`,
          });
        } else {
          const text = await initRes.text().catch(() => "");
          setUploadState({
            type: "fatal_error",
            error: `(${initRes.status}) ${text.trim().slice(0, 300) || "Error desconocido"}`,
          });
        }
        return;
      }

      const initBody = (await initRes.json()) as { uploadId: string; chunkSize: number };
      uploadId = initBody.uploadId;
      const chunkSize = initBody.chunkSize;
      const totalChunks = Math.max(1, Math.ceil(selectedFile.size / chunkSize));

      for (let partNumber = 0; partNumber < totalChunks; partNumber++) {
        const start = partNumber * chunkSize;
        const end = Math.min(selectedFile.size, start + chunkSize);
        const chunk = selectedFile.slice(start, end);

        setUploadState({
          type: "progress",
          message: `Subiendo bloque ${partNumber + 1} de ${totalChunks}...`,
          uploadedChunks: partNumber,
          totalChunks,
        });

        await uploadChunkWithRetry(
          `/api/snapshot/uploads/${uploadId}?partNumber=${partNumber}`,
          adminKey.trim(),
          chunk,
        );

        setUploadState({
          type: "progress",
          message: `Subiendo bloque ${partNumber + 1} de ${totalChunks}...`,
          uploadedChunks: partNumber + 1,
          totalChunks,
        });
      }

      setUploadState({
        type: "progress",
        message: "Archivo recibido. Iniciando procesamiento...",
        uploadedChunks: totalChunks,
        totalChunks,
      });

      const res = await fetch(`/api/snapshot/uploads/${uploadId}/complete`, {
        method: "POST",
        headers: {
          "x-admin-key": adminKey.trim(),
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          totalChunks,
        }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const body = await res.json().catch(() => null);
          setUploadState({
            type: "fatal_error",
            error: `(${res.status}) ${body?.error ?? JSON.stringify(body) ?? "Error desconocido"}`,
          });
        } else {
          const text = await res.text().catch(() => "");
          setUploadState({
            type: "fatal_error",
            error: `(${res.status}) ${text.trim().slice(0, 300) || "Error desconocido"}`,
          });
        }
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setUploadState({
          type: "fatal_error",
          error: "La respuesta del servidor no soporta streaming.",
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let shouldRefresh = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = JSON.parse(line) as
            | {
              type: "progress";
              message: string;
              processedRows?: number;
              totalRows?: number;
              uploadedChunks?: number;
              totalChunks?: number;
            }
            | { type: "completed"; totalRows: number }
            | { type: "validation_error"; issues: ParseIssue[] }
            | { type: "fatal_error"; error: string };

          if (event.type === "progress") {
            setUploadState({
              type: "progress",
              message: event.message,
              processedRows: event.processedRows,
              totalRows: event.totalRows,
              uploadedChunks: event.uploadedChunks ?? totalChunks,
              totalChunks: event.totalChunks ?? totalChunks,
            });
            continue;
          }

          if (event.type === "validation_error") {
            setUploadState({ type: "validation_error", issues: event.issues });
            continue;
          }

          if (event.type === "fatal_error") {
            setUploadState({ type: "fatal_error", error: event.error });
            continue;
          }

          shouldRefresh = true;
          setUploadState({ type: "completed", rowCount: event.totalRows });
        }
      }

      if (!shouldRefresh) return;

      await refreshDataset();
      setOpen(false);
      setSelectedFile(null);
      setUploadState({ type: "idle" });
    } catch (error) {
      if (uploadId) {
        await fetch(`/api/snapshot/uploads/${uploadId}`, {
          method: "DELETE",
          headers: { "x-admin-key": adminKey.trim() },
        }).catch(() => undefined);
      }

      setUploadState({
        type: "fatal_error",
        error: error instanceof Error ? error.message : "Error desconocido durante la carga.",
      });
    } finally {
      setUploading(false);
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
          setSelectedFile(null);
          setUploadState({ type: "idle" });
        }}
        className="w-full justify-start gap-2"
      >
        {triggerIcon || <Upload className="size-4" />}
        {triggerLabel || "Reemplazar dataset"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reemplazar dataset</DialogTitle>
            <DialogDescription>
              La carga se procesa en el servidor por lotes y reemplaza completamente la data actual.
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-2" />

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
            <div className="mt-1 text-[10px] text-white/40">Se guarda en localStorage.</div>
          </div>

          <div
            {...getRootProps()}
            className={cn(
              "group flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/3 px-4 py-4 text-center transition hover:bg-white/5",
              isDragActive ? "border-cyan-400/40 bg-cyan-400/5" : null,
            )}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="mb-1 size-5 text-cyan-200/90" />
            <div className="text-sm font-medium">Arrastra tu XLSX aqui o haz click</div>
            <div className="mt-1 text-xs text-white/50">
              Solo se permite <strong>1 archivo</strong>; se reemplazara el dataset completo.
            </div>
          </div>

          {selectedFile && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/3 p-2 text-xs">
                <FileSpreadsheet className="size-4 flex-shrink-0 text-cyan-300/80" />
                <span className="flex-1 truncate text-white/80">{selectedFile.name}</span>
                {uploadState.type === "completed" ? (
                  <Badge variant="success">{formatInt(uploadState.rowCount)} filas</Badge>
                ) : uploadState.type === "validation_error" || uploadState.type === "fatal_error" ? (
                  <Badge variant="danger">Error</Badge>
                ) : uploading ? (
                  <Badge variant="neutral">Procesando...</Badge>
                ) : (
                  <Badge variant="neutral">Listo para cargar</Badge>
                )}
              </div>
            </div>
          )}

          {uploadState.type === "progress" && (
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs text-cyan-100">
              <div>{uploadState.message}</div>
              {uploadState.totalRows ? (
                <div className="mt-1 text-cyan-100/75">
                  {formatInt(uploadState.processedRows ?? 0)} / {formatInt(uploadState.totalRows)} filas
                  {uploadState.totalChunks
                    ? ` · bloque ${formatInt(uploadState.uploadedChunks ?? 0)} / ${formatInt(uploadState.totalChunks)}`
                    : null}
                </div>
              ) : null}
            </div>
          )}

          {uploadState.type === "validation_error" && <IssueList issues={uploadState.issues} />}

          {uploadState.type === "fatal_error" && (
            <div className="rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs text-red-200">
              {uploadState.error}
            </div>
          )}

          {meta && (
            <div className="rounded-lg border border-white/10 bg-white/3 p-2 text-xs text-white/45">
              Datos actuales: <strong>{meta.sourceFileName}</strong> · {formatInt(meta.rowCount)} filas ·
              Importado {new Date(meta.importedAtISO).toLocaleString("es-CL")}
            </div>
          )}

          <Button
            className="w-full"
            disabled={!canUpload}
            onClick={handleUpload}
          >
            {uploading ? "Procesando carga..." : "Reemplazar dataset"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
