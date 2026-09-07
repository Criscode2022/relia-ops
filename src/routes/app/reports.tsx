import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Card, Skeleton } from "@/components/ui";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/relia/domain";
import { getReports } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

const tooltipStyle = {
  background: "#13171e",
  border: "1px solid #262d36",
  borderRadius: 8,
  color: "#ece8e1",
};

function ReportsPage() {
  const { data, loading, error } = useAsync(() => getReports(), []);

  if (loading || !data) return <Skeleton className="h-96" />;
  if (error) return <p className="text-danger">{error}</p>;

  const byStatus = data.byStatus.map((s) => ({
    name: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));
  const byType = data.byType.map((s) => ({
    name: TYPE_LABEL[s.type] ?? s.type,
    count: s.count,
  }));

  return (
    <div>
      <PageHeader
        kicker="Reliability"
        title="Plant performance"
        description="Work mix, weekly throughput, MTTR, and the assets that consume downtime."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">MTTR</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{data.mttrHours}h</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Completed / 30d</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{data.completed30d}</p>
        </Card>
        <Card className="p-4 col-span-2 md:col-span-1">
          <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Raised / 30d</p>
          <p className="mt-2 font-display text-3xl tabular-nums">{data.created30d}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-2xl">Weekly throughput</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekly}>
                <CartesianGrid stroke="#262d36" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "#9aa193", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9aa193", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="opened" name="Opened" fill="#7f93a6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#c5d0c8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-2xl">Mix by type</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} layout="vertical" barSize={14}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fill: "#9aa193", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#c5d0c8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-2xl">By status</h2>
          <ul className="space-y-2 text-sm">
            {byStatus.map((s) => (
              <li key={s.name} className="flex justify-between">
                <span className="text-fg-muted">{s.name}</span>
                <span className="tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-2xl">Downtime (90 days)</h2>
          <ul className="space-y-2 text-sm">
            {data.topDowntime.length === 0 ? (
              <li className="text-fg-muted">No downtime recorded.</li>
            ) : (
              data.topDowntime.map((a) => (
                <li key={a.assetName} className="flex justify-between gap-3">
                  <span>{a.assetName}</span>
                  <span className="tabular-nums text-fg-muted">{a.minutes} min</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
