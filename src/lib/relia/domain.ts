import type { WoStatus } from "./types";

const TRANSITIONS: Record<WoStatus, WoStatus[]> = {
  open: ["assigned", "in_progress", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["waiting_parts", "completed", "cancelled"],
  waiting_parts: ["in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: WoStatus, to: WoStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextActions(from: WoStatus): WoStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function isOpenStatus(status: WoStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}

export function formatWoNumber(seq: number): string {
  return `REL-${String(seq).padStart(4, "0")}`;
}

export function pmCompliance(totalActive: number, overdue: number): number {
  if (totalActive <= 0) return 100;
  const onTime = Math.max(0, totalActive - overdue);
  return Math.round((onTime / totalActive) * 100);
}

export function hoursFromMinutes(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

export function parseMoney(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return 0;
}

export function asIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  return s.length ? s : null;
}

export function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return 0;
}

export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting_parts: "Waiting parts",
  completed: "Completed",
  cancelled: "Cancelled",
  running: "Running",
  degraded: "Degraded",
  down: "Down",
  retired: "Retired",
  active: "Active",
};

export const TYPE_LABEL: Record<string, string> = {
  corrective: "Corrective",
  preventive: "Preventive",
  emergency: "Emergency",
  inspection: "Inspection",
};

export const PRIORITY_LABEL: Record<string, string> = {
  p1: "P1 · Critical",
  p2: "P2 · High",
  p3: "P3 · Medium",
  p4: "P4 · Low",
};

export const TRADE_LABEL: Record<string, string> = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  instrumentation: "Instrumentation",
  general: "General",
};

export const KIND_LABEL: Record<string, string> = {
  plant: "Treatment plant",
  pump_station: "Pump station",
  campus: "Campus",
  warehouse: "Warehouse",
};
