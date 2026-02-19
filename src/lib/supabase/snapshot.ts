import "server-only";

import crypto from "node:crypto";

import type { Dataset, DatasetMeta, NormalizedRow } from "@/lib/data-processing/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SnapshotMetaRow = {
  id: number;
  imported_at: string;
  source_file_name: string;
  sheet_name: string;
  row_count: number;
  active_version: string;
};

type SnapshotRow = {
  version: string;
  tipo: "Stock" | "Web";
  dia_label: string | null;
  mes: number | null;
  dia_numero: number | null;
  cargada: number;
  recorrido: number;
  contactado: number;
  citas: number;
  af: number;
  mc: number;
  pct_contactabilidad: number | null;
  pct_efectividad: number | null;
  tc_af: number | null;
  tc_mc: number | null;
};

function toMeta(row: SnapshotMetaRow): DatasetMeta {
  return {
    importedAtISO: row.imported_at,
    sourceFileName: row.source_file_name,
    sheetName: row.sheet_name,
    rowCount: row.row_count,
  };
}

function toNormalizedRow(r: SnapshotRow): NormalizedRow {
  return {
    tipo: r.tipo,
    diaLabel: r.dia_label,
    mes: r.mes,
    diaNumero: r.dia_numero,
    cargada: r.cargada,
    recorrido: r.recorrido,
    contactado: r.contactado,
    citas: r.citas,
    af: r.af,
    mc: r.mc,
    pctContactabilidad: r.pct_contactabilidad,
    pctEfectividad: r.pct_efectividad,
    tcAf: r.tc_af,
    tcMc: r.tc_mc,
  };
}

function toSnapshotRow(version: string, r: NormalizedRow): SnapshotRow {
  return {
    version,
    tipo: r.tipo,
    dia_label: r.diaLabel,
    mes: r.mes,
    dia_numero: r.diaNumero,
    cargada: r.cargada,
    recorrido: r.recorrido,
    contactado: r.contactado,
    citas: r.citas,
    af: r.af,
    mc: r.mc,
    pct_contactabilidad: r.pctContactabilidad,
    pct_efectividad: r.pctEfectividad,
    tc_af: r.tcAf,
    tc_mc: r.tcMc,
  };
}

async function insertRowsInBatches(rows: SnapshotRow[], batchSize = 1000) {
  const supabase = getSupabaseServerClient();
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("snapshot_rows").insert(batch);
    if (error) throw error;
  }
}

export async function getActiveSnapshot(): Promise<Dataset | null> {
  const supabase = getSupabaseServerClient();
  const { data: metaRow, error: metaError } = await supabase
    .from("snapshot_meta")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (metaError) throw metaError;
  if (!metaRow) return null;

  const meta = toMeta(metaRow as SnapshotMetaRow);
  const activeVersion = (metaRow as SnapshotMetaRow).active_version;

  const { data: rows, error: rowsError } = await supabase
    .from("snapshot_rows")
    .select(
      "version,tipo,dia_label,mes,dia_numero,cargada,recorrido,contactado,citas,af,mc,pct_contactabilidad,pct_efectividad,tc_af,tc_mc",
    )
    .eq("version", activeVersion)
    .order("mes", { ascending: true, nullsFirst: false })
    .order("dia_numero", { ascending: true, nullsFirst: false })
    .order("tipo", { ascending: true });
  if (rowsError) throw rowsError;

  return {
    meta,
    rows: (rows as SnapshotRow[]).map(toNormalizedRow),
  };
}

export async function replaceSnapshot(dataset: Dataset): Promise<{ meta: DatasetMeta }> {
  const supabase = getSupabaseServerClient();
  const version = crypto.randomUUID();

  const snapshotRows = dataset.rows.map((r) => toSnapshotRow(version, r));
  await insertRowsInBatches(snapshotRows, 1000);

  const metaRow: SnapshotMetaRow = {
    id: 1,
    imported_at: dataset.meta.importedAtISO,
    source_file_name: dataset.meta.sourceFileName,
    sheet_name: dataset.meta.sheetName,
    row_count: dataset.meta.rowCount,
    active_version: version,
  };

  const { error: upsertError } = await supabase
    .from("snapshot_meta")
    .upsert(metaRow, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const { error: cleanupError } = await supabase
    .from("snapshot_rows")
    .delete()
    .neq("version", version);
  if (cleanupError) throw cleanupError;

  return { meta: dataset.meta };
}

