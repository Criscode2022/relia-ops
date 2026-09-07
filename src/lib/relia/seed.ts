import type { Sql } from "@/lib/db";

function id(): string {
  return crypto.randomUUID();
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

async function log(
  sql: Sql,
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  detail: string,
) {
  await sql`
    insert into activity_log (id, user_id, entity_type, entity_id, action, detail)
    values (${id()}, ${userId}, ${entityType}, ${entityId}, ${action}, ${detail})
  `;
}

export async function ensureWorkspace(sql: Sql, userId: string): Promise<void> {
  const orders = await sql<{ n: number }>`
    select count(*)::int as n from work_orders where user_id = ${userId}
  `;
  if ((orders[0]?.n ?? 0) > 0) {
    await sql`
      insert into workspaces (user_id, org_name, wo_seq, seeded_at)
      values (${userId}, ${"Riverside Water Authority"}, ${1048}, now())
      on conflict (user_id) do nothing
    `;
    return;
  }

  await sql`delete from wo_comments where user_id = ${userId}`;
  await sql`delete from wo_parts where user_id = ${userId}`;
  await sql`delete from work_orders where user_id = ${userId}`;
  await sql`delete from pm_plans where user_id = ${userId}`;
  await sql`delete from parts where user_id = ${userId}`;
  await sql`delete from assets where user_id = ${userId}`;
  await sql`delete from technicians where user_id = ${userId}`;
  await sql`delete from sites where user_id = ${userId}`;
  await sql`delete from activity_log where user_id = ${userId}`;
  await sql`delete from workspaces where user_id = ${userId}`;

  try {
    await seedPlant(sql, userId);
  } catch (err) {
    throw new Error(
      `Could not seed Relia workspace: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function seedPlant(sql: Sql, userId: string): Promise<void> {
  const existing = await sql<{ user_id: string }>`
    select user_id from workspaces where user_id = ${userId} limit 1
  `;
  if (existing.length) return;

  await sql`
    insert into workspaces (user_id, org_name, wo_seq, seeded_at)
    values (${userId}, ${"Riverside Water Authority"}, ${1048}, now())
  `;

  const riverside = id();
  const eastbank = id();

  await sql`
    insert into sites (id, user_id, name, code, city, region, kind, status, notes)
    values
      (${riverside}, ${userId}, ${"Riverside Water Treatment"}, ${"RWT"}, ${"Portland"}, ${"Oregon"}, ${"plant"}, ${"active"}, ${"Primary potable plant. 42 MGD design capacity. SCADA on ring 2."}),
      (${eastbank}, ${userId}, ${"Eastbank Pump Station"}, ${"EPS"}, ${"Gresham"}, ${"Oregon"}, ${"pump_station"}, ${"active"}, ${"High-service boost to the east zone. Two duty, one standby."})
  `;

  const techs = {
    maya: id(),
    luis: id(),
    priya: id(),
    jonah: id(),
  };

  await sql`
    insert into technicians (id, user_id, name, trade, role, email, phone, status)
    values
      (${techs.maya}, ${userId}, ${"Maya Chen"}, ${"electrical"}, ${"Lead electrician"}, ${"maya.chen@riverside.ops"}, ${"+1 503 555 0142"}, ${"active"}),
      (${techs.luis}, ${userId}, ${"Luis Ortega"}, ${"mechanical"}, ${"Millwright"}, ${"luis.ortega@riverside.ops"}, ${"+1 503 555 0188"}, ${"active"}),
      (${techs.priya}, ${userId}, ${"Priya Shah"}, ${"instrumentation"}, ${"I&C specialist"}, ${"priya.shah@riverside.ops"}, ${"+1 503 555 0117"}, ${"active"}),
      (${techs.jonah}, ${userId}, ${"Jonah Hale"}, ${"general"}, ${"Utility technician"}, ${"jonah.hale@riverside.ops"}, ${"+1 503 555 0194"}, ${"active"})
  `;

  const assets = {
    pump1: id(),
    pump2: id(),
    intake: id(),
    clarifier: id(),
    blower: id(),
    generator: id(),
    chem: id(),
    scada: id(),
    ahu: id(),
    sludge: id(),
    uv: id(),
    valve: id(),
    hs1: id(),
    hs2: id(),
  };

  await sql`
    insert into assets (
      id, user_id, site_id, name, asset_tag, category, manufacturer, model, serial_no,
      criticality, status, installed_on, warranty_until, notes
    ) values
      (${assets.pump1}, ${userId}, ${riverside}, ${"High-Service Pump 1"}, ${"PMP-401"}, ${"Pump"}, ${"Flowserve"}, ${"32LM"}, ${"FS-401-22"}, ${"A"}, ${"running"}, ${"2018-04-12"}, ${"2027-04-12"}, ${"Duty pump. Vibration trending up on inboard bearing."}),
      (${assets.pump2}, ${userId}, ${riverside}, ${"High-Service Pump 2"}, ${"PMP-402"}, ${"Pump"}, ${"Flowserve"}, ${"32LM"}, ${"FS-402-22"}, ${"A"}, ${"degraded"}, ${"2018-04-12"}, ${"2027-04-12"}, ${"Seal weep observed. Scheduled for packing replacement."}),
      (${assets.intake}, ${userId}, ${riverside}, ${"Raw Water Intake Screen"}, ${"SCR-110"}, ${"Screen"}, ${"Evoqua"}, ${"Brackett"}, ${"EV-110-19"}, ${"A"}, ${"running"}, ${"2016-09-01"}, null, ${"Rake cycle every 20 minutes at high turbidity."}),
      (${assets.clarifier}, ${userId}, ${riverside}, ${"Clarifier Drive A"}, ${"CLR-210"}, ${"Drive"}, ${"Evoqua"}, ${"Tow-Bro"}, ${"EV-210-16"}, ${"A"}, ${"running"}, ${"2016-09-01"}, null, ${""}),
      (${assets.blower}, ${userId}, ${riverside}, ${"Aeration Blower 3"}, ${"BLW-303"}, ${"Blower"}, ${"Aerzen"}, ${"GM 50L"}, ${"AZ-303-21"}, ${"A"}, ${"down"}, ${"2021-03-18"}, ${"2026-03-18"}, ${"Tripped on high discharge temp. Isolation valves closed."}),
      (${assets.generator}, ${userId}, ${riverside}, ${"Backup Diesel Generator"}, ${"GEN-900"}, ${"Power"}, ${"Caterpillar"}, ${"C32"}, ${"CAT-900-20"}, ${"A"}, ${"running"}, ${"2020-11-02"}, ${"2026-11-02"}, ${"Weekly unloaded test. 800 kW."}),
      (${assets.chem}, ${userId}, ${riverside}, ${"Chemical Feed Skid"}, ${"CHF-510"}, ${"Chemical"}, ${"Grundfos"}, ${"DDA"}, ${"GF-510-19"}, ${"B"}, ${"running"}, ${"2019-06-20"}, null, ${"Sodium hypochlorite. Dual diaphragm."}),
      (${assets.scada}, ${userId}, ${riverside}, ${"SCADA Historian"}, ${"SCA-001"}, ${"Controls"}, ${"AVEVA"}, ${"PI Server"}, ${"AV-001-23"}, ${"A"}, ${"running"}, ${"2023-01-09"}, ${"2028-01-09"}, ${"Redundant pair in MDF."}),
      (${assets.ahu}, ${userId}, ${riverside}, ${"HVAC AHU-2"}, ${"AHU-002"}, ${"HVAC"}, ${"Trane"}, ${"IntelliPak"}, ${"TR-002-17"}, ${"C"}, ${"running"}, ${"2017-05-14"}, null, ${"Admin building only."}),
      (${assets.sludge}, ${userId}, ${riverside}, ${"Sludge Transfer Pump"}, ${"PMP-620"}, ${"Pump"}, ${"WEMCO"}, ${"Hidrostal"}, ${"WM-620-18"}, ${"B"}, ${"running"}, ${"2018-08-22"}, null, ${""}),
      (${assets.uv}, ${userId}, ${riverside}, ${"UV Disinfection Bank"}, ${"UV-701"}, ${"Disinfection"}, ${"Trojan"}, ${"UV3000Plus"}, ${"TJ-701-22"}, ${"A"}, ${"running"}, ${"2022-02-11"}, ${"2027-02-11"}, ${"Lamp hours at 8,400. Replace at 12,000."}),
      (${assets.valve}, ${userId}, ${riverside}, ${"Filter Gallery Backwash Valve"}, ${"VLV-330"}, ${"Valve"}, ${"DeZURIK"}, ${"BOS-US"}, ${"DZ-330-16"}, ${"B"}, ${"degraded"}, ${"2016-09-01"}, null, ${"Actuator hunts on close. Positioner suspect."}),
      (${assets.hs1}, ${userId}, ${eastbank}, ${"Eastbank High-Service 1"}, ${"PMP-801"}, ${"Pump"}, ${"Sulzer"}, ${"SJD"}, ${"SZ-801-20"}, ${"A"}, ${"running"}, ${"2020-07-30"}, ${"2026-07-30"}, ${""}),
      (${assets.hs2}, ${userId}, ${eastbank}, ${"Eastbank High-Service 2"}, ${"PMP-802"}, ${"Pump"}, ${"Sulzer"}, ${"SJD"}, ${"SZ-802-20"}, ${"A"}, ${"running"}, ${"2020-07-30"}, ${"2026-07-30"}, ${"Standby. Last run 11 days ago."})
  `;

  const parts = {
    seal: id(),
    bearing: id(),
    packing: id(),
    lamp: id(),
    belt: id(),
    oil: id(),
    gasket: id(),
    probe: id(),
    filter: id(),
    actuator: id(),
    fuse: id(),
    hose: id(),
  };

  await sql`
    insert into parts (id, user_id, sku, name, category, qty_on_hand, min_qty, unit_cost, location)
    values
      (${parts.seal}, ${userId}, ${"SEA-32LM"}, ${"Mechanical seal, Flowserve 32LM"}, ${"Seals"}, ${2}, ${2}, ${1840}, ${"Cage A / Bin 12"}),
      (${parts.bearing}, ${userId}, ${"BRG-6314"}, ${"SKF 6314-2RS bearing"}, ${"Bearings"}, ${6}, ${4}, ${128.5}, ${"Cage A / Bin 04"}),
      (${parts.packing}, ${userId}, ${"PAC-5/8"}, ${"Graphite packing 5/8 in"}, ${"Seals"}, ${1}, ${4}, ${46}, ${"Cage A / Bin 18"}),
      (${parts.lamp}, ${userId}, ${"UV-LAMP"}, ${"Trojan amalgam lamp"}, ${"UV"}, ${8}, ${12}, ${310}, ${"Cage C / UV"}),
      (${parts.belt}, ${userId}, ${"BLT-BX59"}, ${"BX59 blower belt set"}, ${"Drive"}, ${3}, ${2}, ${74}, ${"Cage B / 07"}),
      (${parts.oil}, ${userId}, ${"OIL-ISO46"}, ${"ISO 46 turbine oil, 5 gal"}, ${"Lubricants"}, ${9}, ${4}, ${88}, ${"Flammables"}),
      (${parts.gasket}, ${userId}, ${"GSK-8IN"}, ${"8 in spiral wound gasket"}, ${"Gaskets"}, ${14}, ${6}, ${22.4}, ${"Cage A / 21"}),
      (${parts.probe}, ${userId}, ${"PRB-DO"}, ${"Dissolved oxygen probe"}, ${"Instruments"}, ${1}, ${2}, ${640}, ${"I&C locker"}),
      (${parts.filter}, ${userId}, ${"FLT-AHU"}, ${"AHU-2 bag filter set"}, ${"HVAC"}, ${4}, ${2}, ${96}, ${"Mezzanine"}),
      (${parts.actuator}, ${userId}, ${"ACT-BOS"}, ${"DeZURIK positioner kit"}, ${"Valves"}, ${0}, ${1}, ${1280}, ${"Cage B / 02"}),
      (${parts.fuse}, ${userId}, ${"FUSE-60A"}, ${"60A class J fuse"}, ${"Electrical"}, ${18}, ${8}, ${14.2}, ${"MCC spare"}),
      (${parts.hose}, ${userId}, ${"HOSE-CHL"}, ${"Hypo transfer hose 1 in"}, ${"Chemical"}, ${2}, ${2}, ${54}, ${"Chem building"})
  `;

  const plans = {
    pump1: id(),
    pump2: id(),
    gen: id(),
    uv: id(),
    blower: id(),
    hs1: id(),
    clarifier: id(),
    scada: id(),
  };

  await sql`
    insert into pm_plans (
      id, user_id, asset_id, title, frequency_days, last_completed_at, next_due_at,
      estimated_hours, checklist, active
    ) values
      (${plans.pump1}, ${userId}, ${assets.pump1}, ${"Quarterly pump service"}, ${90}, ${daysFromNow(-80)}, ${daysFromNow(10)}, ${4}, ${"Oil sample; coupling alignment; packing adjustment; vibration route."}, ${true}),
      (${plans.pump2}, ${userId}, ${assets.pump2}, ${"Monthly seal inspection"}, ${30}, ${daysFromNow(-38)}, ${daysFromNow(-8)}, ${1.5}, ${"Check leak-off; feel bearing housing; log seal water flow."}, ${true}),
      (${plans.gen}, ${userId}, ${assets.generator}, ${"Weekly generator test"}, ${7}, ${daysFromNow(-6)}, ${daysFromNow(1)}, ${1}, ${"Unloaded run 15 min; check coolant; battery voltage; ATS exercise."}, ${true}),
      (${plans.uv}, ${userId}, ${assets.uv}, ${"UV lamp hours & sleeve clean"}, ${30}, ${daysFromNow(-21)}, ${daysFromNow(9)}, ${3}, ${"Record lamp hours; wipe sleeves; inspect ballasts; dose check."}, ${true}),
      (${plans.blower}, ${userId}, ${assets.blower}, ${"Blower oil & belt service"}, ${60}, ${daysFromNow(-70)}, ${daysFromNow(-10)}, ${2.5}, ${"Change oil; inspect belts; clean inlet filter; log discharge temp."}, ${true}),
      (${plans.hs1}, ${userId}, ${assets.hs1}, ${"Eastbank vibration route"}, ${14}, ${daysFromNow(-12)}, ${daysFromNow(2)}, ${1}, ${"Handheld vibration on DE/NDE; record in CMMS."}, ${true}),
      (${plans.clarifier}, ${userId}, ${assets.clarifier}, ${"Clarifier drive grease"}, ${45}, ${daysFromNow(-40)}, ${daysFromNow(5)}, ${2}, ${"Grease main bearing; inspect rake arms; torque check."}, ${true}),
      (${plans.scada}, ${userId}, ${assets.scada}, ${"Historian backup verify"}, ${7}, ${daysFromNow(-8)}, ${daysFromNow(-1)}, ${0.5}, ${"Confirm nightly backup; restore test of one tag set."}, ${true})
  `;

  const wos: Array<{
    id: string;
    site: string;
    asset: string;
    tech: string | null;
    pm: string | null;
    number: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    status: string;
    due: string | null;
    started: string | null;
    completed: string | null;
    hours: number;
    down: number;
    createdOff: number;
  }> = [
    {
      id: id(),
      site: riverside,
      asset: assets.blower,
      tech: techs.luis,
      pm: null,
      number: "REL-1036",
      title: "Blower 3 high discharge temperature trip",
      description:
        "BLW-303 tripped twice on night shift. Discharge temp 118°C. Isolation complete. Need oil analysis and belt inspection before restart.",
      type: "emergency",
      priority: "p1",
      status: "in_progress",
      due: daysFromNow(0),
      started: daysFromNow(-0.4),
      completed: null,
      hours: 3.5,
      down: 420,
      createdOff: -0.5,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.pump2,
      tech: techs.luis,
      pm: plans.pump2,
      number: "REL-1037",
      title: "PMP-402 seal weep — packing replacement",
      description: "Steady weep at stuffing box. Replace packing and adjust lantern ring. Coordinate with ops for a 4-hour window.",
      type: "corrective",
      priority: "p2",
      status: "waiting_parts",
      due: daysFromNow(1),
      started: daysFromNow(-2),
      completed: null,
      hours: 1,
      down: 0,
      createdOff: -2,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.valve,
      tech: techs.priya,
      pm: null,
      number: "REL-1038",
      title: "Backwash valve positioner hunt",
      description: "VLV-330 hunts ±8% on close. Ops reports incomplete backwash. Positioner kit is below min stock — on order.",
      type: "corrective",
      priority: "p2",
      status: "open",
      due: daysFromNow(3),
      started: null,
      completed: null,
      hours: 0,
      down: 35,
      createdOff: -1,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.generator,
      tech: techs.maya,
      pm: plans.gen,
      number: "REL-1039",
      title: "Weekly generator unloaded test",
      description: "Standard weekly CAT C32 exercise. Log oil pressure and ATS transfer time.",
      type: "preventive",
      priority: "p3",
      status: "assigned",
      due: daysFromNow(1),
      started: null,
      completed: null,
      hours: 0,
      down: 0,
      createdOff: -1,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.uv,
      tech: techs.jonah,
      pm: plans.uv,
      number: "REL-1040",
      title: "UV sleeve clean and lamp-hour log",
      description: "Banks 1–3 due. Transmitter 2 reading 2% low versus handheld.",
      type: "preventive",
      priority: "p3",
      status: "open",
      due: daysFromNow(9),
      started: null,
      completed: null,
      hours: 0,
      down: 0,
      createdOff: -3,
    },
    {
      id: id(),
      site: eastbank,
      asset: assets.hs1,
      tech: techs.priya,
      pm: plans.hs1,
      number: "REL-1041",
      title: "Eastbank vibration route",
      description: "PMP-801 DE bearing 4.8 mm/s last round. Recheck after oil top-up.",
      type: "inspection",
      priority: "p3",
      status: "assigned",
      due: daysFromNow(2),
      started: null,
      completed: null,
      hours: 0,
      down: 0,
      createdOff: -2,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.scada,
      tech: techs.maya,
      pm: plans.scada,
      number: "REL-1042",
      title: "Historian backup verification overdue",
      description: "Nightly job flagged skip on Saturday. Confirm restore of chlorine residual tags.",
      type: "preventive",
      priority: "p2",
      status: "open",
      due: daysFromNow(-1),
      started: null,
      completed: null,
      hours: 0,
      down: 0,
      createdOff: -4,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.intake,
      tech: techs.jonah,
      pm: null,
      number: "REL-1031",
      title: "Intake rake jam after storm",
      description: "Debris mat after Willamette rise. Cleared rake, replaced shear pin.",
      type: "emergency",
      priority: "p1",
      status: "completed",
      due: daysFromNow(-12),
      started: daysFromNow(-13),
      completed: daysFromNow(-12),
      hours: 5,
      down: 180,
      createdOff: -13,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.chem,
      tech: techs.maya,
      pm: null,
      number: "REL-1032",
      title: "Hypo pump diaphragm replacement",
      description: "DDA head B leaking at flange. Replaced diaphragm and hose.",
      type: "corrective",
      priority: "p2",
      status: "completed",
      due: daysFromNow(-9),
      started: daysFromNow(-10),
      completed: daysFromNow(-9),
      hours: 2.5,
      down: 90,
      createdOff: -10,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.pump1,
      tech: techs.luis,
      pm: plans.pump1,
      number: "REL-1028",
      title: "Quarterly service PMP-401",
      description: "Oil sample sent to lab. Alignment within spec. Packing adjusted 1/4 turn.",
      type: "preventive",
      priority: "p3",
      status: "completed",
      due: daysFromNow(-18),
      started: daysFromNow(-19),
      completed: daysFromNow(-18),
      hours: 4,
      down: 240,
      createdOff: -20,
    },
    {
      id: id(),
      site: eastbank,
      asset: assets.hs2,
      tech: techs.luis,
      pm: null,
      number: "REL-1024",
      title: "Standby pump rotation run",
      description: "Brought PMP-802 online for 6 hours. No abnormal heat.",
      type: "inspection",
      priority: "p4",
      status: "completed",
      due: daysFromNow(-22),
      started: daysFromNow(-22),
      completed: daysFromNow(-22),
      hours: 1,
      down: 0,
      createdOff: -23,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.ahu,
      tech: techs.jonah,
      pm: null,
      number: "REL-1020",
      title: "AHU-2 bag filters",
      description: "Seasonal changeout. ΔP was 1.4 in wg.",
      type: "preventive",
      priority: "p4",
      status: "completed",
      due: daysFromNow(-28),
      started: daysFromNow(-28),
      completed: daysFromNow(-28),
      hours: 1.5,
      down: 0,
      createdOff: -29,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.clarifier,
      tech: techs.luis,
      pm: plans.clarifier,
      number: "REL-1043",
      title: "Clarifier drive grease and torque",
      description: "Main bearing grease. Inspect rake torque limiter.",
      type: "preventive",
      priority: "p3",
      status: "open",
      due: daysFromNow(5),
      started: null,
      completed: null,
      hours: 0,
      down: 0,
      createdOff: -1,
    },
    {
      id: id(),
      site: riverside,
      asset: assets.blower,
      tech: null,
      pm: plans.blower,
      number: "REL-1044",
      title: "Overdue blower oil & belt PM",
      description: "Auto-raised from PM plan. Do not start BLW-303 until emergency trip is cleared.",
      type: "preventive",
      priority: "p2",
      status: "open",
      due: daysFromNow(-10),
      started: null,
      completed: null,
      hours: 0,
      down: 0,
      createdOff: -6,
    },
  ];

  for (const wo of wos) {
    await sql`
      insert into work_orders (
        id, user_id, site_id, asset_id, technician_id, pm_plan_id, "number", title, description,
        "type", priority, status, due_at, started_at, completed_at, labor_hours, downtime_minutes, created_at
      ) values (
        ${wo.id}, ${userId}, ${wo.site}, ${wo.asset}, ${wo.tech}, ${wo.pm}, ${wo.number}, ${wo.title},
        ${wo.description}, ${wo.type}, ${wo.priority}, ${wo.status}, ${wo.due}, ${wo.started},
        ${wo.completed}, ${wo.hours}, ${wo.down}, ${daysFromNow(wo.createdOff)}
      )
    `;
  }

  const blowerWo = wos[0]!;
  const pump2Wo = wos[1]!;
  const hypoWo = wos[8]!;

  await sql`
    insert into wo_parts (id, user_id, work_order_id, part_id, qty)
    values
      (${id()}, ${userId}, ${blowerWo.id}, ${parts.oil}, ${1}),
      (${id()}, ${userId}, ${pump2Wo.id}, ${parts.packing}, ${2}),
      (${id()}, ${userId}, ${hypoWo.id}, ${parts.hose}, ${1})
  `;

  await sql`
    insert into wo_comments (id, user_id, work_order_id, author_name, body, created_at)
    values
      (${id()}, ${userId}, ${blowerWo.id}, ${"Maya Chen"}, ${"Locked out at MCC-3. Ops confirmed isolation. Oil sample pulled for lab."}, ${daysFromNow(-0.4)}),
      (${id()}, ${userId}, ${blowerWo.id}, ${"Luis Ortega"}, ${"Belts glazed. Replacement set in hand. Holding restart until oil result."}, ${daysFromNow(-0.2)}),
      (${id()}, ${userId}, ${pump2Wo.id}, ${"Luis Ortega"}, ${"Packing on hand is below min after this job. Please raise a restock."}, ${daysFromNow(-1)})
  `;

  await log(sql, userId, "workspace", userId, "seeded", "Riverside Water Authority demo plant loaded.");
  await log(sql, userId, "work_order", blowerWo.id, "started", "BLW-303 emergency trip — work started.");
  await log(sql, userId, "work_order", pump2Wo.id, "waiting_parts", "PMP-402 packing replacement waiting stock.");
  await log(sql, userId, "asset", assets.blower, "status", "Aeration Blower 3 marked down.");
}
