import { computeTotals } from "../src/lib/data-processing/metrics.ts";
import { normalizeRow } from "../src/lib/data-processing/normalize.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeRows(rawRows) {
  const rows = [];
  for (let i = 0; i < rawRows.length; i++) {
    const out = normalizeRow(rawRows[i], i);
    if (out.row) rows.push(out.row);
  }
  return rows;
}

const baseRawRows = [
  {
    "Tipo Llamada": "Outbound",
    "Fecha Carga": "2025-08-18",
    "Rut Base": "11.111.111-1",
    "Tipo Base": "Lead",
    "Fecha Gestion": "2025-08-18",
    Conecta: "Conecta",
    Interesa: "Viene",
    Regimen: "Diurno",
    "Sede Interes": "LF",
    Semana: "Semana 2",
    AF: "A",
    "Fecha af": "2025-08-20",
    MC: "",
    "Fecha MC": "",
  },
  {
    "Tipo Llamada": "Outbound",
    "Fecha Carga": "2025-08-19",
    "Rut Base": "22.222.222-2",
    "Tipo Base": "Stock",
    "Fecha Gestion": "2025-08-19",
    Conecta: "No Conecta",
    Interesa: "No viene",
    Regimen: "Vespertino",
    "Sede Interes": "SC",
    Semana: "Semana 2",
    AF: "",
    "Fecha af": "",
    MC: "",
    "Fecha MC": "",
  },
  {
    "Tipo Llamada": "Inbound",
    "Fecha Carga": "2025-08-20",
    "Rut Base": "33.333.333-3",
    "Tipo Base": "Inbound",
    "Fecha Gestion": "2025-08-20",
    Conecta: "Conecta",
    Interesa: "Viene",
    Regimen: "Diurno",
    "Sede Interes": "PR",
    Semana: "Semana 2",
    AF: "MC",
    "Fecha af": "2025-08-22",
    MC: "MC",
    "Fecha MC": "2025-08-24",
  },
];

const withNewOptionalColumns = baseRawRows.map((row) => ({
  ...row,
  Agente: "",
  "Marketing 5": null,
  CodigoBanner: " ",
  "Carrera Interes": "",
}));

const rowsA = normalizeRows(baseRawRows);
const rowsB = normalizeRows(withNewOptionalColumns);

assert(rowsA.length === rowsB.length, "Row count differs between A and B.");

const totalsA = computeTotals(rowsA);
const totalsB = computeTotals(rowsB);

assert(
  JSON.stringify(totalsA) === JSON.stringify(totalsB),
  `KPI no-regression failed.\nA=${JSON.stringify(totalsA)}\nB=${JSON.stringify(totalsB)}`,
);

console.log("KPI no-regression OK: métricas idénticas con y sin columnas nuevas.");
