import {
  asIso,
  asNumber,
  parseMoney,
} from "./domain";
import type {
  Activity,
  Asset,
  AssetStatus,
  Criticality,
  DashboardKpis,
  Part,
  PmPlan,
  Site,
  SiteKind,
  Technician,
  Trade,
  WoComment,
  WoPartLine,
  WoPriority,
  WoStatus,
  WoType,
  WorkOrder,
} from "./types";

export function mapSite(row: Record<string, unknown>): Site {
  return {
    id: String(row.id),
    name: String(row.name),
    code: String(row.code),
    city: String(row.city),
    region: String(row.region),
    kind: row.kind as SiteKind,
    status: String(row.status),
    notes: String(row.notes ?? ""),
    assetCount: asNumber(row.asset_count),
    openWork: asNumber(row.open_work),
  };
}

export function mapTech(row: Record<string, unknown>): Technician {
  return {
    id: String(row.id),
    name: String(row.name),
    trade: row.trade as Trade,
    role: String(row.role),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    status: String(row.status),
    openWork: asNumber(row.open_work),
  };
}

export function mapAsset(row: Record<string, unknown>): Asset {
  return {
    id: String(row.id),
    siteId: String(row.site_id),
    siteName: String(row.site_name ?? ""),
    name: String(row.name),
    assetTag: String(row.asset_tag),
    category: String(row.category),
    manufacturer: String(row.manufacturer ?? ""),
    model: String(row.model ?? ""),
    serialNo: String(row.serial_no ?? ""),
    criticality: row.criticality as Criticality,
    status: row.status as AssetStatus,
    installedOn: asIso(row.installed_on),
    warrantyUntil: asIso(row.warranty_until),
    notes: String(row.notes ?? ""),
    openWork: asNumber(row.open_work),
  };
}

export function mapPart(row: Record<string, unknown>): Part {
  const qty = asNumber(row.qty_on_hand);
  const min = asNumber(row.min_qty);
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    category: String(row.category),
    qtyOnHand: qty,
    minQty: min,
    unitCost: parseMoney(row.unit_cost),
    location: String(row.location ?? ""),
    belowMin: qty < min,
  };
}

export function mapPlan(row: Record<string, unknown>): PmPlan {
  const nextDue = asIso(row.next_due_at) ?? new Date().toISOString();
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    assetName: String(row.asset_name ?? ""),
    assetTag: String(row.asset_tag ?? ""),
    siteName: String(row.site_name ?? ""),
    title: String(row.title),
    frequencyDays: asNumber(row.frequency_days),
    lastCompletedAt: asIso(row.last_completed_at),
    nextDueAt: nextDue,
    estimatedHours: parseMoney(row.estimated_hours),
    checklist: String(row.checklist ?? ""),
    active: Boolean(row.active),
    overdue: new Date(nextDue).getTime() < Date.now() && Boolean(row.active),
  };
}

export function mapWo(row: Record<string, unknown>): WorkOrder {
  return {
    id: String(row.id),
    siteId: String(row.site_id),
    siteName: String(row.site_name ?? ""),
    assetId: String(row.asset_id),
    assetName: String(row.asset_name ?? ""),
    assetTag: String(row.asset_tag ?? ""),
    technicianId: row.technician_id ? String(row.technician_id) : null,
    technicianName: row.technician_name ? String(row.technician_name) : null,
    pmPlanId: row.pm_plan_id ? String(row.pm_plan_id) : null,
    number: String(row.number),
    title: String(row.title),
    description: String(row.description ?? ""),
    type: row.type as WoType,
    priority: row.priority as WoPriority,
    status: row.status as WoStatus,
    dueAt: asIso(row.due_at),
    startedAt: asIso(row.started_at),
    completedAt: asIso(row.completed_at),
    laborHours: parseMoney(row.labor_hours),
    downtimeMinutes: asNumber(row.downtime_minutes),
    createdAt: asIso(row.created_at) ?? new Date().toISOString(),
  };
}

export function mapWoPart(row: Record<string, unknown>): WoPartLine {
  return {
    id: String(row.id),
    partId: String(row.part_id),
    sku: String(row.sku),
    name: String(row.name),
    qty: asNumber(row.qty),
    unitCost: parseMoney(row.unit_cost),
  };
}

export function mapComment(row: Record<string, unknown>): WoComment {
  return {
    id: String(row.id),
    authorName: String(row.author_name),
    body: String(row.body),
    createdAt: asIso(row.created_at) ?? new Date().toISOString(),
  };
}

export function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    action: String(row.action),
    detail: String(row.detail ?? ""),
    createdAt: asIso(row.created_at) ?? new Date().toISOString(),
  };
}

export function emptyKpis(): DashboardKpis {
  return {
    openWork: 0,
    emergencyOpen: 0,
    overduePm: 0,
    assetsDown: 0,
    partsBelowMin: 0,
    pmCompliance: 100,
    mttrHours: 0,
    downtimeHours30d: 0,
  };
}
