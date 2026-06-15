import fs from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "database");

// ── CSV parser (handles quoted fields, embedded newlines, BOM) ────────────────
function parseCSV(raw: string): Record<string, string>[] {
  const text = raw.replace(/^﻿/, ""); // strip BOM
  const fields: string[][] = [[]];
  let row = 0;
  let inQuote = false;
  let field = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ",") {
      fields[row].push(field);
      field = "";
    } else if (ch === "\r" && text[i + 1] === "\n") {
      fields[row].push(field);
      field = "";
      row++;
      fields[row] = [];
      i++;
    } else if (ch === "\n") {
      fields[row].push(field);
      field = "";
      row++;
      fields[row] = [];
    } else {
      field += ch;
    }
  }
  // flush last field
  if (field || fields[row].length > 0) fields[row].push(field);

  const headers = fields[0] ?? [];
  return fields
    .slice(1)
    .filter((r) => r.some((v) => v.trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
      return obj;
    });
}

function coerceValue(v: string): unknown {
  if (v === "" || v === "null" || v === "NULL" || v === "na") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  const n = Number(v);
  if (!Number.isNaN(n) && v.trim() !== "") return n;
  return v;
}

function applyColumnMap(
  row: Record<string, string>,
  columnMap: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const newKey = columnMap[key] ?? key;
    result[newKey] = coerceValue(value);
  }
  return result;
}

// ── Table config: CSV filename → JSON filename + column renames ───────────────
const TABLE_CONFIG: {
  jsonFile: string;
  csvFile: string;
  columnMap: Record<string, string>;
}[] = [
  {
    jsonFile: "customer_info.json",
    csvFile: "customer_info.csv",
    columnMap: {
      CustomerSegment: "customerSegment",
      DebtMindSegment: "debtMindSegment",
      grpDPD: "grpDpd",
      SumOsNCB: "sumOsNcb",
      NCBCheckDate: "ncbCheckDate",
      EligibleProgram: "eligibleProgram",
      IncomeFromSystem: "incomeFromSystem",
      employment_type: "employmentType",
      InstallmentNCB_Y1: "installmentNcbY1",
      InstallmentNCB_Y2: "installmentNcbY2",
      InstallmentNCB_Y3: "installmentNcbY3",
    },
  },
  {
    jsonFile: "customer_acc_detail.json",
    csvFile: "customer_acc_detail.csv",
    columnMap: { currentDPD: "currentDpd" },
  },
  {
    jsonFile: "conversation.json",
    csvFile: "Conversation.csv",
    columnMap: {},
  },
  {
    jsonFile: "session_info.json",
    csvFile: "sessionInfo.csv",
    columnMap: { ConsiderAccount: "considerAccount" },
  },
  {
    jsonFile: "restructure_offer_summary.json",
    csvFile: "restructureOfferSummary.csv",
    columnMap: {},
  },
  {
    jsonFile: "restructure_offer_account.json",
    csvFile: "restructureOfferAccount.csv",
    columnMap: {},
  },
  {
    jsonFile: "staff_escalation_info.json",
    csvFile: "StaffEscalationInfo.csv",
    columnMap: {},
  },
];

// ── One-time CSV → JSON initialisation ───────────────────────────────────────
let initialised = false;

function ensureJsonFiles(): void {
  if (initialised) return;
  for (const cfg of TABLE_CONFIG) {
    const jsonPath = path.join(DB_DIR, cfg.jsonFile);
    if (!fs.existsSync(jsonPath)) {
      const csvPath = path.join(DB_DIR, cfg.csvFile);
      if (fs.existsSync(csvPath)) {
        const raw = fs.readFileSync(csvPath, "utf-8");
        const rows = parseCSV(raw).map((r) => applyColumnMap(r, cfg.columnMap));
        fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf-8");
      } else {
        fs.writeFileSync(jsonPath, "[]", "utf-8");
      }
    }
  }
  initialised = true;
}

// ── Core helpers ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJson<T = any>(jsonFile: string): T[] {
  ensureJsonFiles();
  const fp = path.join(DB_DIR, jsonFile);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, "utf-8")) as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeJson<T = any>(jsonFile: string, data: T[]): void {
  ensureJsonFiles();
  fs.writeFileSync(path.join(DB_DIR, jsonFile), JSON.stringify(data, null, 2), "utf-8");
}

function maxId(rows: Record<string, unknown>[]): number {
  if (!rows.length) return 0;
  return Math.max(...rows.map((r) => Number(r.id) || 0));
}

// ── Public read functions ─────────────────────────────────────────────────────

/** Most-recent customer record (largest mdata) matching cif */
export function getCustomerInfo(cif: string) {
  const all = readJson("customer_info.json");
  const matching = all.filter((c) => String(c.cif) === String(cif));
  if (!matching.length) return null;
  return matching.sort((a, b) =>
    String(b.mdata).localeCompare(String(a.mdata))
  )[0];
}

/** All account records for most-recent mdata batch matching cif */
export function getAccountDetails(cif: string) {
  const all = readJson("customer_acc_detail.json");
  const matching = all.filter((c) => String(c.cif) === String(cif));
  if (!matching.length) return [];
  const latestMdata = matching
    .map((c) => String(c.mdata))
    .sort()
    .reverse()[0];
  return matching.filter((c) => String(c.mdata) === latestMdata);
}

/** All conversation rows for a session, sorted oldest-first */
export function getConversationHistory(sessionId: string) {
  const all = readJson("conversation.json");
  return all
    .filter((c) => c.sessionId === sessionId)
    .sort(
      (a, b) =>
        new Date(String(a.createdAt || 0)).getTime() -
        new Date(String(b.createdAt || 0)).getTime()
    );
}

/** Most-recent session_info row for the given sessionId; returns [] if none */
export function getSessionInfo(sessionId: string) {
  const all = readJson("session_info.json");
  const matching = all.filter((s) => s.sessionId === sessionId);
  if (!matching.length) return [];
  const latest = matching.sort(
    (a, b) =>
      new Date(String(b.updatedAt || b.createdAt || 0)).getTime() -
      new Date(String(a.updatedAt || a.createdAt || 0)).getTime()
  )[0];
  return [latest];
}

/** Deduplicated offer summaries (by planId, capped at `limit`) for a session */
export function getOfferSummary(sessionId: string, limit = 20) {
  const all = readJson("restructure_offer_summary.json");
  const matching = all
    .filter((o) => o.sessionId === sessionId && o.planId)
    .sort(
      (a, b) =>
        new Date(String(b.createdAt || 0)).getTime() -
        new Date(String(a.createdAt || 0)).getTime()
    );
  const seen = new Set<string>();
  return matching
    .filter((o) => {
      if (seen.has(String(o.planId))) return false;
      seen.add(String(o.planId));
      return true;
    })
    .slice(0, limit);
}

/** All offer-account rows for a session */
export function getOfferAccount(sessionId: string) {
  const all = readJson("restructure_offer_account.json");
  return all.filter((o) => o.sessionId === sessionId);
}

// ── Public write functions ────────────────────────────────────────────────────

export function appendConversation(entry: Record<string, unknown>) {
  const all = readJson("conversation.json");
  const now = new Date().toISOString();
  all.push({ id: maxId(all) + 1, ...entry, createdAt: now, updatedAt: now });
  writeJson("conversation.json", all);
}

/** Upsert: update the most-recent row by sessionId, or insert a new one */
export function upsertSessionInfo(
  sessionId: string,
  data: Record<string, unknown>
) {
  const all = readJson("session_info.json");
  const now = new Date().toISOString();
  let idx = -1;
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].sessionId === sessionId) { idx = i; break; }
  }
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...data, sessionId, updatedAt: now };
  } else {
    all.push({ id: maxId(all) + 1, ...data, sessionId, createdAt: now, updatedAt: now });
  }
  writeJson("session_info.json", all);
}

export function appendOfferSummary(entries: Record<string, unknown>[]) {
  const all = readJson("restructure_offer_summary.json");
  const now = new Date().toISOString();
  let nextId = maxId(all);
  for (const entry of entries) {
    nextId++;
    all.push({ id: nextId, ...entry, createdAt: now, updatedAt: now });
  }
  writeJson("restructure_offer_summary.json", all);
}

export function appendOfferAccount(entries: Record<string, unknown>[]) {
  const all = readJson("restructure_offer_account.json");
  const now = new Date().toISOString();
  let nextId = maxId(all);
  for (const entry of entries) {
    nextId++;
    all.push({ id: nextId, ...entry, createdAt: now, updatedAt: now });
  }
  writeJson("restructure_offer_account.json", all);
}

export function appendStaffEscalationInfo(entries: Record<string, unknown>[]) {
  const all = readJson("staff_escalation_info.json");
  for (const entry of entries) all.push(entry);
  writeJson("staff_escalation_info.json", all);
}
