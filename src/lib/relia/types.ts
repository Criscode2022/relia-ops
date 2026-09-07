export const ASSET_STATUSES = ["running", "degraded", "down", "retired"] as const;
export const CRITICALITIES = ["A", "B", "C"] as const;
export const WO_TYPES = ["corrective", "preventive", "emergency", "inspection"] as const;
export const WO_PRIORITIES = ["p1", "p2", "p3", "p4"] as const;
export const WO_STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "waiting_parts",
  "completed",
  "cancelled",
] as const;
export const SITE_KINDS = ["plant", "pump_station", "campus", "warehouse"] as const;
export const TRADES = ["mechanical", "electrical", "instrumentation", "general"] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type Criticality = (typeof CRITICALITIES)[number];
export type WoType = (typeof WO_TYPES)[number];
export type WoPriority = (typeof WO_PRIORITIES)[number];
export type WoStatus = (typeof WO_STATUSES)[number];
export type SiteKind = (typeof SITE_KINDS)[number];
export type Trade = (typeof TRADES)[number];

export type Site = {
  id: string;
  name: string;
  code: string;
  city: string;
  region: string;
  kind: SiteKind;
  status: string;
  notes: string;
  assetCount: number;
  openWork: number;
};

export type Technician = {
  id: string;
  name: string;
  trade: Trade;
  role: string;
  email: string;
  phone: string;
  status: string;
  openWork: number;
};

export type Asset = {
  id: string;
  siteId: string;
  siteName: string;
  name: string;
  assetTag: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNo: string;
  criticality: Criticality;
  status: AssetStatus;
  installedOn: string | null;
  warrantyUntil: string | null;
  notes: string;
  openWork: number;
};

export type Part = {
  id: string;
  sku: string;
  name: string;
  category: string;
  qtyOnHand: number;
  minQty: number;
  unitCost: number;
  location: string;
  belowMin: boolean;
};

export type PmPlan = {
  id: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  siteName: string;
  title: string;
  frequencyDays: number;
  lastCompletedAt: string | null;
  nextDueAt: string;
  estimatedHours: number;
  checklist: string;
  active: boolean;
  overdue: boolean;
};

export type WorkOrder = {
  id: string;
  siteId: string;
  siteName: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  technicianId: string | null;
  technicianName: string | null;
  pmPlanId: string | null;
  number: string;
  title: string;
  description: string;
  type: WoType;
  priority: WoPriority;
  status: WoStatus;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  laborHours: number;
  downtimeMinutes: number;
  createdAt: string;
};

export type WoPartLine = {
  id: string;
  partId: string;
  sku: string;
  name: string;
  qty: number;
  unitCost: number;
};

export type WoComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type DashboardKpis = {
  openWork: number;
  emergencyOpen: number;
  overduePm: number;
  assetsDown: number;
  partsBelowMin: number;
  pmCompliance: number;
  mttrHours: number;
  downtimeHours30d: number;
};

export type StatusCount = { status: string; count: number };
export type TypeCount = { type: string; count: number };
export type WeekPoint = { week: string; opened: number; completed: number };
export type AssetDowntime = { assetName: string; minutes: number };

export type ReportsPayload = {
  byStatus: StatusCount[];
  byType: TypeCount[];
  weekly: WeekPoint[];
  topDowntime: AssetDowntime[];
  mttrHours: number;
  completed30d: number;
  created30d: number;
};

export type Workspace = {
  orgName: string;
  seeded: boolean;
};
