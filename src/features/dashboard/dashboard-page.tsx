"use client";

import { useData } from "@/features/dashboard/hooks/useData";
import { PowerBILayout } from "@/features/dashboard/components/power-bi-layout";
import { Upload } from "lucide-react";
import { DataUploadDialog } from "@/features/dashboard/components/upload/data-upload-dialog";

export function DashboardPage() {
  const { meta } = useData();

  // If no data, show upload prompt simply
  if (!meta) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Bienvenido</h1>
          <p className="text-white/50">Carga un archivo Excel para visualizar el dashboard.</p>
          <div className="flex justify-center">
            <DataUploadDialog />
          </div>
        </div>
      </div>
    )
  }

  return <PowerBILayout />;
}
