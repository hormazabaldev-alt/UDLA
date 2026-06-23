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
    "Fecha Carga": "2026-03-16",
    "Rut Base": "11.111.111-1",
    "Tipo Base": "Lead",
    "Fecha Gestion": "2026-03-16",
    Conecta: "Conecta",
    Interesa: "Viene",
    Regimen: "Diurno",
    "Sede Interes": "LF",
    Semana: "Semana 1",
    AF: "A",
    "Fecha af": "2026-03-18",
    MC: "",
    "Fecha MC": "",
  },
  {
    "Tipo Llamada": "Outbound",
    "Fecha Carga": "2026-03-17",
    "Rut Base": "22.222.222-2",
    "Tipo Base": "Stock",
    "Fecha Gestion": "2026-03-17",
    Conecta: "No Conecta",
    Interesa: "No viene",
    Regimen: "Vespertino",
    "Sede Interes": "SC",
    Semana: "Semana 1",
    AF: "",
    "Fecha af": "",
    MC: "",
    "Fecha MC": "",
  },
  {
    "Tipo Llamada": "Inbound",
    "Fecha Carga": "2026-03-18",
    "Rut Base": "33.333.333-3",
    "Tipo Base": "Inbound",
    "Fecha Gestion": "2026-03-18",
    Conecta: "Conecta",
    Interesa: "Viene",
    Regimen: "Diurno",
    "Sede Interes": "PR",
    Semana: "Semana 1",
    AF: "MC",
    "Fecha af": "2026-03-20",
    MC: "MC",
    "Fecha MC": "2026-03-22",
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

const sinCitaRows = normalizeRows([
  {
    "Tipo Llamada": "Outbound",
    "Fecha Carga": "2026-03-16",
    "Rut Base": "44.444.444-4",
    "Tipo Base": "Lead",
    "Fecha Gestion": "2026-03-16",
    Conecta: "Conecta",
    Interesa: "No viene",
    Regimen: "Diurno",
    "Sede Interes": "LF",
    Semana: "Semana 1",
    AF: "A",
    "Fecha af": "2026-03-18",
    MC: "",
    "Fecha MC": "",
  },
  {
    "Tipo Llamada": "Outbound",
    "Fecha Carga": "2026-03-17",
    "Rut Base": "55.555.555-5",
    "Tipo Base": "Lead",
    "Fecha Gestion": "2026-03-17",
    Conecta: "Conecta",
    Interesa: "",
    Regimen: "Diurno",
    "Sede Interes": "LF",
    Semana: "Semana 1",
    AF: "M",
    "Fecha af": "2026-03-18",
    MC: "M",
    "Fecha MC": "2026-03-19",
  },
  {
    "Tipo Llamada": "Outbound",
    "Fecha Carga": "2026-03-18",
    "Rut Base": "66.666.666-6",
    "Tipo Base": "Lead",
    "Fecha Gestion": "2026-03-18",
    Conecta: "Conecta",
    Interesa: "Viene",
    Regimen: "Diurno",
    "Sede Interes": "LF",
    Semana: "Semana 1",
    AF: "MC",
    "Fecha af": "2026-03-20",
    MC: "MC",
    "Fecha MC": "2026-03-21",
  },
]);

const sinCitaTotals = computeTotals(sinCitaRows);

assert(sinCitaTotals.af === 3, `Expected 3 afluencias, got ${sinCitaTotals.af}`);
assert(sinCitaTotals.afConCita === 1, `Expected 1 afluencia con cita, got ${sinCitaTotals.afConCita}`);
assert(sinCitaTotals.afSinCita === 2, `Expected 2 afluencias sin cita, got ${sinCitaTotals.afSinCita}`);
assert(sinCitaTotals.mc === 2, `Expected 2 matriculas, got ${sinCitaTotals.mc}`);
assert(sinCitaTotals.mcConCita === 1, `Expected 1 matricula con cita, got ${sinCitaTotals.mcConCita}`);
assert(sinCitaTotals.mcSinCita === 1, `Expected 1 matricula sin cita, got ${sinCitaTotals.mcSinCita}`);
assert(sinCitaTotals.pctAfSinCita === 2 / 3, `Expected pctAfSinCita 2/3, got ${sinCitaTotals.pctAfSinCita}`);
assert(sinCitaTotals.pctMcSinCita === 1 / 2, `Expected pctMcSinCita 1/2, got ${sinCitaTotals.pctMcSinCita}`);

console.log("KPI no-regression OK: métricas idénticas con y sin columnas nuevas.");
