import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, TypeBadge, WoStatusBadge } from "@/components/status";
import { Card, Skeleton } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/relia/domain";
import { fromNow } from "@/lib/relia/format";
import { getDashboard } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
    </Card>
  );
}

function Dashboard() {
  const { data, loading, error } = useAsync(() => getDashboard(), []);

  if (error) {
    return (
      <p className="rounded-[var(--radius-md)] border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        {error}
      </p>
    );
  }

  if (loading || !data) {
    return (
      <div>
        <p className="mb-4 text-sm text-fg-muted">Loading the board…</p>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const chart = data.byStatus.map((s) => ({
    name: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));

  return (
    <div>
      <PageHeader
        kicker="Board"
        title="Riverside operations"
        description="Open work, overdue preventive, stores at risk, and the jobs that need a decision now."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open work" value={data.kpis.openWork} hint={`${data.kpis.emergencyOpen} emergency`} />
        <Kpi label="Overdue PM" value={data.kpis.overduePm} hint={`${data.kpis.pmCompliance}% on time`} />
        <Kpi label="Assets down" value={data.kpis.assetsDown} hint={`${data.kpis.mttrHours}h MTTR`} />
        <Kpi
          label="Stores below min"
          value={data.kpis.partsBelowMin}
          hint={`${data.kpis.downtimeHours30d}h down / 30d`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Needs attention</h2>
            <Link to="/app/work" className="text-sm text-fg-muted hover:text-fg">
              All work
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.attention.length === 0 ? (
              <p className="py-8 text-sm text-fg-muted">Nothing overdue or high-priority. Quiet board.</p>
            ) : (
              data.attention.map((wo) => (
                <Link
                  key={wo.id}
                  to="/app/work/$orderId"
                  params={{ orderId: wo.id }}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-[11px] text-fg-subtle">{wo.number}</p>
                    <p className="text-sm">{wo.title}</p>
                    <p className="text-xs text-fg-muted">
                      {wo.assetTag} · {wo.siteName}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={wo.priority} />
                    <TypeBadge type={wo.type} />
                    <WoStatusBadge status={wo.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-2xl">Open by status</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barSize={22}>
                <XAxis dataKey="name" tick={{ fill: "#9aa193", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#13171e",
                    border: "1px solid #262d36",
                    borderRadius: 8,
                    color: "#ece8e1",
                  }}
                />
                <Bar dataKey="count" fill="#c5d0c8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Preventive due</h2>
            <Link to="/app/pm" className="text-sm text-fg-muted hover:text-fg">
              Plans
            </Link>
          </div>
          <ul className="space-y-3">
            {data.upcomingPm.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm">{p.title}</p>
                  <p className="text-xs text-fg-muted">
                    {p.assetTag} · {p.siteName}
                  </p>
                </div>
                <span className={p.overdue ? "text-xs text-danger" : "text-xs text-fg-muted"}>
                  {fromNow(p.nextDueAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-2xl">Activity</h2>
          <ul className="space-y-3">
            {data.activity.map((a) => (
              <li key={a.id}>
                <p className="text-sm">{a.detail || a.action}</p>
                <p className="text-xs text-fg-subtle">{fromNow(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
