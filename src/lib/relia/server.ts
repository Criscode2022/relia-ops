import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  canTransition,
  formatWoNumber,
  hoursFromMinutes,
  isOpenStatus,
  pmCompliance,
} from "./domain";
import {
  emptyKpis,
  mapActivity,
  mapAsset,
  mapComment,
  mapPart,
  mapPlan,
  mapSite,
  mapTech,
  mapWo,
  mapWoPart,
} from "./map";
import { ensureWorkspace } from "./seed";
import type {
  Asset,
  DashboardKpis,
  Part,
  PmPlan,
  ReportsPayload,
  Site,
  Technician,
  WoComment,
  WoPartLine,
  WoStatus,
  WorkOrder,
  Workspace,
} from "./types";

const WO_SELECT = `
  select wo.id, wo.site_id, s.name as site_name, wo.asset_id, a.name as asset_name, a.asset_tag,
  wo.technician_id, t.name as technician_name, wo.pm_plan_id, wo.number, wo.title, wo.description,
  wo.type, wo.priority, wo.status, wo.due_at, wo.started_at, wo.completed_at,
  wo.labor_hours, wo.downtime_minutes, wo.created_at
`;

async function log(
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  detail: string,
) {
  const sql = await getSql();
  await sql`
    insert into activity_log (id, user_id, entity_type, entity_id, action, detail)
    values (${crypto.randomUUID()}, ${userId}, ${entityType}, ${entityId}, ${action}, ${detail})
  `;
}

async function authorName(userId: string): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ name: string | null; email: string | null }>`
    select name, email from "user" where id = ${userId} limit 1
  `;
  const row = rows[0];
  return row?.name || row?.email || "Operator";
}

export const bootstrapWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureWorkspace(sql, context.userId);
    const ws = await sql<{ org_name: string; seeded_at: unknown }>`
      select org_name, seeded_at from workspaces where user_id = ${context.userId}
    `;
    const result: Workspace = {
      orgName: ws[0]?.org_name ?? "Relia",
      seeded: Boolean(ws[0]?.seeded_at),
    };
    return result;
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureWorkspace(sql, context.userId);
    const uid = context.userId;

    const [openWork] = await sql<{ n: number }>`
      select count(*)::int as n from work_orders
      where user_id = ${uid} and status not in ('completed','cancelled')
    `;
    const [emergency] = await sql<{ n: number }>`
      select count(*)::int as n from work_orders
      where user_id = ${uid} and type = 'emergency' and status not in ('completed','cancelled')
    `;
    const [overduePm] = await sql<{ n: number }>`
      select count(*)::int as n from pm_plans
      where user_id = ${uid} and active = true and next_due_at < now()
    `;
    const [activePm] = await sql<{ n: number }>`
      select count(*)::int as n from pm_plans where user_id = ${uid} and active = true
    `;
    const [down] = await sql<{ n: number }>`
      select count(*)::int as n from assets where user_id = ${uid} and status = 'down'
    `;
    const [lowParts] = await sql<{ n: number }>`
      select count(*)::int as n from parts where user_id = ${uid} and qty_on_hand < min_qty
    `;
    const [mttr] = await sql<{ minutes: number }>`
      select coalesce(avg(extract(epoch from (completed_at - started_at)) / 60), 0)::float as minutes
      from work_orders
      where user_id = ${uid} and status = 'completed' and started_at is not null and completed_at is not null
        and completed_at > now() - interval '90 days'
    `;
    const [down30] = await sql<{ minutes: number }>`
      select coalesce(sum(downtime_minutes), 0)::int as minutes
      from work_orders
      where user_id = ${uid} and created_at > now() - interval '30 days'
    `;

    const kpis: DashboardKpis = {
      openWork: openWork?.n ?? 0,
      emergencyOpen: emergency?.n ?? 0,
      overduePm: overduePm?.n ?? 0,
      assetsDown: down?.n ?? 0,
      partsBelowMin: lowParts?.n ?? 0,
      pmCompliance: pmCompliance(activePm?.n ?? 0, overduePm?.n ?? 0),
      mttrHours: hoursFromMinutes(mttr?.minutes ?? 0),
      downtimeHours30d: hoursFromMinutes(down30?.minutes ?? 0),
    };

    const attention = await sql.query(`${WO_SELECT}
      from work_orders wo
      join sites s on s.id = wo.site_id
      join assets a on a.id = wo.asset_id
      left join technicians t on t.id = wo.technician_id
      where wo.user_id = $1
        and (
          wo.status not in ('completed','cancelled') and (wo.priority in ('p1','p2') or wo.due_at < now())
        )
      order by case wo.priority when 'p1' then 1 when 'p2' then 2 when 'p3' then 3 else 4 end,
               wo.due_at nulls last
      limit 8`, [uid]);

    const upcomingPm = await sql.query(
      `select p.*, a.name as asset_name, a.asset_tag, s.name as site_name
       from pm_plans p
       join assets a on a.id = p.asset_id
       join sites s on s.id = a.site_id
       where p.user_id = $1 and p.active = true
       order by p.next_due_at asc
       limit 6`,
      [uid],
    );

    const activity = await sql`
      select * from activity_log where user_id = ${uid} order by created_at desc limit 10
    `;

    const byStatus = await sql<{ status: string; count: number }>`
      select status, count(*)::int as count from work_orders
      where user_id = ${uid} and status not in ('completed','cancelled')
      group by status
    `;

    return {
      kpis: kpis ?? emptyKpis(),
      attention: attention.map((r) => mapWo(r)),
      upcomingPm: upcomingPm.map((r) => mapPlan(r)),
      activity: activity.map((r) => mapActivity(r)),
      byStatus,
    };
  });

export const listSites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query(
      `select s.*,
        (select count(*)::int from assets a where a.site_id = s.id) as asset_count,
        (select count(*)::int from work_orders w where w.site_id = s.id and w.status not in ('completed','cancelled')) as open_work
       from sites s where s.user_id = $1 order by s.name`,
      [context.userId],
    );
    return rows.map((r) => mapSite(r));
  });

export const getSite = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const sites = await sql.query(
      `select s.*,
        (select count(*)::int from assets a where a.site_id = s.id) as asset_count,
        (select count(*)::int from work_orders w where w.site_id = s.id and w.status not in ('completed','cancelled')) as open_work
       from sites s where s.id = $1 and s.user_id = $2`,
      [data.id, context.userId],
    );
    if (!sites[0]) return null;
    const assets = await sql.query(
      `select a.*, s.name as site_name,
        (select count(*)::int from work_orders w where w.asset_id = a.id and w.status not in ('completed','cancelled')) as open_work
       from assets a join sites s on s.id = a.site_id
       where a.site_id = $1 and a.user_id = $2 order by a.asset_tag`,
      [data.id, context.userId],
    );
    const work = await sql.query(
      `${WO_SELECT} from work_orders wo
       join sites s on s.id = wo.site_id join assets a on a.id = wo.asset_id
       left join technicians t on t.id = wo.technician_id
       where wo.site_id = $1 and wo.user_id = $2
       order by wo.created_at desc limit 20`,
      [data.id, context.userId],
    );
    return {
      site: mapSite(sites[0]),
      assets: assets.map((r) => mapAsset(r)),
      work: work.map((r) => mapWo(r)),
    };
  });

export const createSite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().min(2),
      code: z.string().min(2).max(8),
      city: z.string().min(1),
      region: z.string().min(1),
      kind: z.enum(["plant", "pump_station", "campus", "warehouse"]),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const siteId = crypto.randomUUID();
    await sql`
      insert into sites (id, user_id, name, code, city, region, kind, notes)
      values (${siteId}, ${context.userId}, ${data.name}, ${data.code.toUpperCase()}, ${data.city}, ${data.region}, ${data.kind}, ${data.notes ?? ""})
    `;
    await log(context.userId, "site", siteId, "created", `Site ${data.code.toUpperCase()} opened.`);
    return { id: siteId };
  });

export const listAssets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query(
      `select a.*, s.name as site_name,
        (select count(*)::int from work_orders w where w.asset_id = a.id and w.status not in ('completed','cancelled')) as open_work
       from assets a join sites s on s.id = a.site_id
       where a.user_id = $1
       order by a.criticality, a.asset_tag`,
      [context.userId],
    );
    return rows.map((r) => mapAsset(r));
  });

export const getAsset = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query(
      `select a.*, s.name as site_name,
        (select count(*)::int from work_orders w where w.asset_id = a.id and w.status not in ('completed','cancelled')) as open_work
       from assets a join sites s on s.id = a.site_id
       where a.id = $1 and a.user_id = $2`,
      [data.id, context.userId],
    );
    if (!rows[0]) return null;
    const work = await sql.query(
      `${WO_SELECT} from work_orders wo
       join sites s on s.id = wo.site_id join assets a on a.id = wo.asset_id
       left join technicians t on t.id = wo.technician_id
       where wo.asset_id = $1 and wo.user_id = $2
       order by wo.created_at desc limit 20`,
      [data.id, context.userId],
    );
    const plans = await sql.query(
      `select p.*, a.name as asset_name, a.asset_tag, s.name as site_name
       from pm_plans p join assets a on a.id = p.asset_id join sites s on s.id = a.site_id
       where p.asset_id = $1 and p.user_id = $2`,
      [data.id, context.userId],
    );
    return {
      asset: mapAsset(rows[0]),
      work: work.map((r) => mapWo(r)),
      plans: plans.map((r) => mapPlan(r)),
    };
  });

export const createAsset = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      siteId: z.string(),
      name: z.string().min(2),
      assetTag: z.string().min(2),
      category: z.string().min(1),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      serialNo: z.string().optional(),
      criticality: z.enum(["A", "B", "C"]),
      status: z.enum(["running", "degraded", "down", "retired"]),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const site = await sql`
      select id from sites where id = ${data.siteId} and user_id = ${context.userId}
    `;
    if (!site[0]) throw new Error("Site not found");
    const assetId = crypto.randomUUID();
    await sql`
      insert into assets (
        id, user_id, site_id, name, asset_tag, category, manufacturer, model, serial_no, criticality, status, notes
      ) values (
        ${assetId}, ${context.userId}, ${data.siteId}, ${data.name}, ${data.assetTag.toUpperCase()},
        ${data.category}, ${data.manufacturer ?? ""}, ${data.model ?? ""}, ${data.serialNo ?? ""},
        ${data.criticality}, ${data.status}, ${data.notes ?? ""}
      )
    `;
    await log(context.userId, "asset", assetId, "created", `${data.assetTag.toUpperCase()} registered.`);
    return { id: assetId };
  });

export const updateAssetStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string(), status: z.enum(["running", "degraded", "down", "retired"]) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update assets set status = ${data.status}
      where id = ${data.id} and user_id = ${context.userId}
    `;
    await log(context.userId, "asset", data.id, "status", `Asset marked ${data.status}.`);
    return { ok: true };
  });

export const listTechnicians = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query(
      `select t.*,
        (select count(*)::int from work_orders w where w.technician_id = t.id and w.status not in ('completed','cancelled')) as open_work
       from technicians t where t.user_id = $1 order by t.name`,
      [context.userId],
    );
    return rows.map((r) => mapTech(r));
  });

export const createTechnician = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().min(2),
      trade: z.enum(["mechanical", "electrical", "instrumentation", "general"]),
      role: z.string().min(2),
      email: z.string().optional(),
      phone: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const techId = crypto.randomUUID();
    await sql`
      insert into technicians (id, user_id, name, trade, role, email, phone)
      values (${techId}, ${context.userId}, ${data.name}, ${data.trade}, ${data.role}, ${data.email ?? ""}, ${data.phone ?? ""})
    `;
    await log(context.userId, "technician", techId, "created", `${data.name} added to crew.`);
    return { id: techId };
  });

export const listParts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from parts where user_id = ${context.userId} order by name`;
    return rows.map((r) => mapPart(r));
  });

export const createPart = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      sku: z.string().min(2),
      name: z.string().min(2),
      category: z.string().min(1),
      qtyOnHand: z.number().int().nonnegative(),
      minQty: z.number().int().nonnegative(),
      unitCost: z.number().nonnegative(),
      location: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const partId = crypto.randomUUID();
    await sql`
      insert into parts (id, user_id, sku, name, category, qty_on_hand, min_qty, unit_cost, location)
      values (${partId}, ${context.userId}, ${data.sku.toUpperCase()}, ${data.name}, ${data.category},
              ${data.qtyOnHand}, ${data.minQty}, ${data.unitCost}, ${data.location ?? ""})
    `;
    return { id: partId };
  });

export const adjustPartQty = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string(), delta: z.number().int() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update parts set qty_on_hand = greatest(0, qty_on_hand + ${data.delta})
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const listPmPlans = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query(
      `select p.*, a.name as asset_name, a.asset_tag, s.name as site_name
       from pm_plans p
       join assets a on a.id = p.asset_id
       join sites s on s.id = a.site_id
       where p.user_id = $1
       order by p.next_due_at asc`,
      [context.userId],
    );
    return rows.map((r) => mapPlan(r));
  });

export const generatePmWorkOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ planId: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const plans = await sql.query(
      `select p.*, a.site_id from pm_plans p
       join assets a on a.id = p.asset_id
       where p.id = $1 and p.user_id = $2`,
      [data.planId, context.userId],
    );
    const plan = plans[0];
    if (!plan) throw new Error("Plan not found");
    const seqRows = await sql<{ wo_seq: number }>`
      update workspaces set wo_seq = wo_seq + 1
      where user_id = ${context.userId}
      returning wo_seq
    `;
    const number = formatWoNumber(seqRows[0]?.wo_seq ?? 1001);
    const woId = crypto.randomUUID();
    await sql`
      insert into work_orders (
        id, user_id, site_id, asset_id, pm_plan_id, "number", title, description,
        "type", priority, status, due_at
      ) values (
        ${woId}, ${context.userId}, ${String(plan.site_id)}, ${String(plan.asset_id)}, ${data.planId},
        ${number}, ${String(plan.title)}, ${String(plan.checklist ?? "")},
        ${"preventive"}, ${"p3"}, ${"open"}, ${plan.next_due_at}
      )
    `;
    await sql`
      update pm_plans
      set next_due_at = next_due_at + (frequency_days || ' days')::interval,
          last_completed_at = now()
      where id = ${data.planId} and user_id = ${context.userId}
    `;
    await log(context.userId, "work_order", woId, "created", `${number} generated from PM.`);
    return { id: woId, number };
  });

export const listWorkOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      status: z.string().optional(),
      type: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const params: unknown[] = [context.userId];
    let where = "wo.user_id = $1";
    if (data.status && data.status !== "all") {
      params.push(data.status);
      where += ` and wo.status = $${params.length}`;
    }
    if (data.type && data.type !== "all") {
      params.push(data.type);
      where += ` and wo.type = $${params.length}`;
    }
    const rows = await sql.query(
      `${WO_SELECT} from work_orders wo
       join sites s on s.id = wo.site_id join assets a on a.id = wo.asset_id
       left join technicians t on t.id = wo.technician_id
       where ${where}
       order by case wo.status
         when 'in_progress' then 1 when 'waiting_parts' then 2 when 'assigned' then 3
         when 'open' then 4 when 'completed' then 5 else 6 end,
         case wo.priority when 'p1' then 1 when 'p2' then 2 when 'p3' then 3 else 4 end,
         wo.created_at desc`,
      params,
    );
    return rows.map((r) => mapWo(r));
  });

export const getWorkOrder = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query(
      `${WO_SELECT} from work_orders wo
       join sites s on s.id = wo.site_id join assets a on a.id = wo.asset_id
       left join technicians t on t.id = wo.technician_id
       where wo.id = $1 and wo.user_id = $2`,
      [data.id, context.userId],
    );
    if (!rows[0]) return null;
    const parts = await sql.query(
      `select wp.id, wp.part_id, p.sku, p.name, wp.qty, p.unit_cost
       from wo_parts wp join parts p on p.id = wp.part_id
       where wp.work_order_id = $1 and wp.user_id = $2`,
      [data.id, context.userId],
    );
    const comments = await sql`
      select * from wo_comments where work_order_id = ${data.id} and user_id = ${context.userId}
      order by created_at asc
    `;
    return {
      workOrder: mapWo(rows[0]),
      parts: parts.map((r) => mapWoPart(r)),
      comments: comments.map((r) => mapComment(r)),
    };
  });

export const createWorkOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      assetId: z.string(),
      title: z.string().min(4),
      description: z.string().optional(),
      type: z.enum(["corrective", "preventive", "emergency", "inspection"]),
      priority: z.enum(["p1", "p2", "p3", "p4"]),
      technicianId: z.string().nullable().optional(),
      dueAt: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const assets = await sql`
      select id, site_id, name, asset_tag from assets
      where id = ${data.assetId} and user_id = ${context.userId}
    `;
    const asset = assets[0];
    if (!asset) throw new Error("Asset not found");
    if (data.technicianId) {
      const tech = await sql`
        select id from technicians where id = ${data.technicianId} and user_id = ${context.userId}
      `;
      if (!tech[0]) throw new Error("Technician not found");
    }
    const seqRows = await sql<{ wo_seq: number }>`
      update workspaces set wo_seq = wo_seq + 1
      where user_id = ${context.userId}
      returning wo_seq
    `;
    const number = formatWoNumber(seqRows[0]?.wo_seq ?? 1001);
    const woId = crypto.randomUUID();
    const status = data.technicianId ? "assigned" : "open";
    await sql`
      insert into work_orders (
        id, user_id, site_id, asset_id, technician_id, "number", title, description,
        "type", priority, status, due_at
      ) values (
        ${woId}, ${context.userId}, ${String(asset.site_id)}, ${data.assetId}, ${data.technicianId ?? null},
        ${number}, ${data.title}, ${data.description ?? ""}, ${data.type}, ${data.priority},
        ${status}, ${data.dueAt ?? null}
      )
    `;
    await log(context.userId, "work_order", woId, "created", `${number} · ${data.title}`);
    return { id: woId, number };
  });

export const transitionWorkOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(["open", "assigned", "in_progress", "waiting_parts", "completed", "cancelled"]),
      technicianId: z.string().nullable().optional(),
      laborHours: z.number().nonnegative().optional(),
      downtimeMinutes: z.number().int().nonnegative().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      select id, status, technician_id from work_orders
      where id = ${data.id} and user_id = ${context.userId}
    `;
    const current = rows[0];
    if (!current) throw new Error("Work order not found");
    const from = current.status as WoStatus;
    if (!canTransition(from, data.status)) {
      throw new Error(`Cannot move from ${from} to ${data.status}`);
    }
    if (data.status === "assigned" || data.status === "in_progress") {
      const techId = data.technicianId ?? (current.technician_id as string | null);
      if (!techId) throw new Error("Assign a technician first");
    }
    const started =
      data.status === "in_progress" && from !== "waiting_parts" ? new Date().toISOString() : null;
    const completed = data.status === "completed" ? new Date().toISOString() : null;
    await sql`
      update work_orders set
        status = ${data.status},
        technician_id = coalesce(${data.technicianId ?? null}, technician_id),
        started_at = coalesce(${started}, started_at),
        completed_at = coalesce(${completed}, completed_at),
        labor_hours = coalesce(${data.laborHours ?? null}, labor_hours),
        downtime_minutes = coalesce(${data.downtimeMinutes ?? null}, downtime_minutes)
      where id = ${data.id} and user_id = ${context.userId}
    `;
    if (data.status === "completed") {
      const wo = await sql<{ asset_id: string; type: string }>`
        select asset_id, type from work_orders where id = ${data.id} and user_id = ${context.userId}
      `;
      if (wo[0]?.type === "emergency" || wo[0]?.type === "corrective") {
        await sql`
          update assets set status = 'running'
          where id = ${wo[0].asset_id} and user_id = ${context.userId} and status = 'down'
        `;
      }
    }
    await log(context.userId, "work_order", data.id, data.status, `Status → ${data.status}`);
    return { ok: true };
  });

export const addWoComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ workOrderId: z.string(), body: z.string().min(1).max(2000) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const wo = await sql`
      select id from work_orders where id = ${data.workOrderId} and user_id = ${context.userId}
    `;
    if (!wo[0]) throw new Error("Work order not found");
    const name = await authorName(context.userId);
    await sql`
      insert into wo_comments (id, user_id, work_order_id, author_name, body)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.workOrderId}, ${name}, ${data.body})
    `;
    return { ok: true };
  });

export const consumePartOnWo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ workOrderId: z.string(), partId: z.string(), qty: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const wo = await sql`
      select id from work_orders where id = ${data.workOrderId} and user_id = ${context.userId}
    `;
    if (!wo[0]) throw new Error("Work order not found");
    const parts = await sql<{ id: string; qty_on_hand: number; name: string }>`
      select id, qty_on_hand, name from parts where id = ${data.partId} and user_id = ${context.userId}
    `;
    const part = parts[0];
    if (!part) throw new Error("Part not found");
    if (part.qty_on_hand < data.qty) throw new Error("Not enough stock");
    await sql`
      update parts set qty_on_hand = qty_on_hand - ${data.qty}
      where id = ${data.partId} and user_id = ${context.userId}
    `;
    await sql`
      insert into wo_parts (id, user_id, work_order_id, part_id, qty)
      values (${crypto.randomUUID()}, ${context.userId}, ${data.workOrderId}, ${data.partId}, ${data.qty})
    `;
    await log(
      context.userId,
      "work_order",
      data.workOrderId,
      "parts",
      `Issued ${data.qty} × ${part.name}`,
    );
    return { ok: true };
  });

export const getReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const uid = context.userId;
    const byStatus = await sql<{ status: string; count: number }>`
      select status, count(*)::int as count from work_orders where user_id = ${uid} group by status
    `;
    const byType = await sql<{ type: string; count: number }>`
      select type, count(*)::int as count from work_orders where user_id = ${uid} group by type
    `;
    const weekly = await sql<{ week: string; opened: number; completed: number }>`
      select to_char(date_trunc('week', d.day), 'Mon DD') as week,
        (select count(*)::int from work_orders w where w.user_id = ${uid}
           and w.created_at >= d.day and w.created_at < d.day + interval '7 days') as opened,
        (select count(*)::int from work_orders w where w.user_id = ${uid}
           and w.completed_at >= d.day and w.completed_at < d.day + interval '7 days') as completed
      from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') as d(day)
    `;
    const topDowntime = await sql<{ assetName: string; minutes: number }>`
      select a.name as "assetName", coalesce(sum(w.downtime_minutes),0)::int as minutes
      from assets a
      left join work_orders w on w.asset_id = a.id and w.created_at > now() - interval '90 days'
      where a.user_id = ${uid}
      group by a.id, a.name
      having coalesce(sum(w.downtime_minutes),0) > 0
      order by minutes desc
      limit 6
    `;
    const [mttr] = await sql<{ minutes: number }>`
      select coalesce(avg(extract(epoch from (completed_at - started_at)) / 60), 0)::float as minutes
      from work_orders
      where user_id = ${uid} and status = 'completed' and started_at is not null and completed_at is not null
    `;
    const [c30] = await sql<{ n: number }>`
      select count(*)::int as n from work_orders
      where user_id = ${uid} and status = 'completed' and completed_at > now() - interval '30 days'
    `;
    const [o30] = await sql<{ n: number }>`
      select count(*)::int as n from work_orders
      where user_id = ${uid} and created_at > now() - interval '30 days'
    `;
    const payload: ReportsPayload = {
      byStatus,
      byType,
      weekly,
      topDowntime,
      mttrHours: hoursFromMinutes(mttr?.minutes ?? 0),
      completed30d: c30?.n ?? 0,
      created30d: o30?.n ?? 0,
    };
    return payload;
  });

export type { Asset, DashboardKpis, Part, PmPlan, Site, Technician, WoComment, WoPartLine, WorkOrder };
