"use client";

import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";

import type { ParseIssue } from "@/lib/data-processing/types";
import { loadAdminKey, persistAdminKey } from "@/lib/persistence/admin-key";
import { broadcastDatasetUpdated } from "@/lib/persistence/dataset-sync";
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
const MAX_PARALLEL_UPLOADS = 3;

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [adminKey, setAdminKey] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>({ type: "idle" });
  const uploadLockRef = useRef(false);

  useEffect(() => {
    setAdminKey(loadAdminKey());
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      const files = accepted.slice(0, 3);
      if (files.length === 0) return;
      setSelectedFiles(files);
      setUploadState({ type: "idle" });
    },
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "application/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    multiple: true,
    maxFiles: 3,
  });

  const canUpload = selectedFiles.length > 0 && !uploading && adminKey.trim().length > 0;

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    if (uploadLockRef.current) return;

    uploadLockRef.current = true;
    setUploading(true);

    let totalUploadedRows = 0;
    let shouldRefresh = false;

    for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex++) {
      const currentFile = selectedFiles[fileIndex];
      const append = fileIndex > 0;

      setUploadState({
        type: "progress",
        message: `Subiendo [${fileIndex + 1}/${selectedFiles.length}] ${currentFile.name}...`,
      });

      let uploadId: string | null = null;
      try {
        const initRes = await fetch("/api/snapshot/uploads", {
          method: "POST",
          headers: {
            "x-admin-key": adminKey.trim(),
            "content-type": "application/json",
          },
          body: JSON.stringify({ fileName: currentFile.name }),
        });

        if (!initRes.ok) {
          throw new Error(`Error iniciando carga archivo ${currentFile.name}`);
        }

        const initBody = (await initRes.json()) as { uploadId: string; chunkSize: number };
        uploadId = initBody.uploadId;
        const chunkSize = initBody.chunkSize;
        const totalChunks = Math.max(1, Math.ceil(currentFile.size / chunkSize));
        let nextPartNumber = 0;
        let uploadedChunks = 0;
        const workerCount = Math.min(MAX_PARALLEL_UPLOADS, totalChunks);

        const uploadWorker = async () => {
          while (nextPartNumber < totalChunks) {
            const partNumber = nextPartNumber;
            nextPartNumber += 1;
            const start = partNumber * chunkSize;
            const end = Math.min(currentFile.size, start + chunkSize);
            const chunk = currentFile.slice(start, end);

            await uploadChunkWithRetry(
              `/api/snapshot/uploads/${uploadId}?partNumber=${partNumber}`,
              adminKey.trim(),
              chunk,
            );

            uploadedChunks += 1;
            setUploadState({
              type: "progress",
              message: `[${fileIndex + 1}/${selectedFiles.length}] Subiendo bloques ${uploadedChunks} de ${totalChunks}...`,
              uploadedChunks,
              totalChunks,
            });
          }
        };

        setUploadState({
          type: "progress",
          message: `[${fileIndex + 1}/${selectedFiles.length}] Subiendo bloques 0 de ${totalChunks}...`,
          uploadedChunks: 0,
          totalChunks,
        });

        await Promise.all(Array.from({ length: workerCount }, () => uploadWorker()));

        setUploadState({
          type: "progress",
          message: `[${fileIndex + 1}/${selectedFiles.length}] Archivo recibido. Procesando...`,
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
            fileName: currentFile.name,
            totalChunks,
            append,
          }),
        });

        if (!res.ok) {
          throw new Error(`Error completando archivo ${currentFile.name}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("La respuesta no soporta streaming.");

        const decoder = new TextDecoder();
        let buffer = "";
        let stopped = false;

        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);

            if (event.type === "progress") {
              setUploadState({
                type: "progress",
                message: `[${fileIndex + 1}/${selectedFiles.length}] ${event.message}`,
                processedRows: event.processedRows,
                totalRows: event.totalRows,
                uploadedChunks: event.uploadedChunks ?? totalChunks,
                totalChunks: event.totalChunks ?? totalChunks,
              });
            } else if (event.type === "validation_error") {
              setUploadState({ type: "validation_error", issues: event.issues });
              stopped = true;
            } else if (event.type === "fatal_error") {
              setUploadState({ type: "fatal_error", error: event.error });
              stopped = true;
            } else if (event.type === "completed") {
              shouldRefresh = true;
              totalUploadedRows = event.totalRows;
            }
          }
        }
        
        if (stopped) break;
      } catch (error) {
        if (uploadId) {
          await fetch(`/api/snapshot/uploads/${uploadId}`, {
            method: "DELETE",
            headers: { "x-admin-key": adminKey.trim() },
          }).catch(() => undefined);
        }
        setUploadState({
          type: "fatal_error",
          error: error instanceof Error ? error.message : "Error desconocido.",
        });
        break; // Stop loop on error
      }
    }

    setUploading(false);
    uploadLockRef.current = false;
    
    if (shouldRefresh) {
      await refreshDataset();
      broadcastDatasetUpdated();
      setUploadState({ type: "completed", rowCount: totalUploadedRows });
      setTimeout(() => setOpen(false), 2000);
      setSelectedFiles([]);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setOpen(true);
          setSelectedFiles([]);
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
            <div className="text-sm font-medium">Arrastra tu XLSX o CSV aqui o haz click</div>
            <div className="mt-1 text-xs text-white/50">
              Solo se permiten hasta <strong>3 archivos</strong> (`.xlsx` o `.csv`); se combinaran en un único dataset.
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {selectedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/3 p-2 text-xs">
                  <FileSpreadsheet className="size-4 flex-shrink-0 text-cyan-300/80" />
                  <span className="flex-1 truncate text-white/80">{file.name}</span>
                </div>
              ))}
              <div className="flex justify-end pr-1 text-xs text-white/40">
                {selectedFiles.length} archivo{selectedFiles.length > 1 ? "s" : ""} seleccionado{selectedFiles.length > 1 ? "s" : ""}
              </div>
              {uploadState.type === "completed" ? (
                <Badge variant="success">{formatInt(uploadState.rowCount)} filas totales</Badge>
              ) : uploadState.type === "validation_error" || uploadState.type === "fatal_error" ? (
                <Badge variant="danger">Error</Badge>
              ) : uploading ? (
                <Badge variant="neutral">Procesando...</Badge>
              ) : (
                <Badge variant="neutral">Listo para cargar</Badge>
              )}
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
