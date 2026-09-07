import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { AssetStatusBadge, CritBadge, WoStatusBadge } from "@/components/status";
import { Button, Select, Skeleton } from "@/components/ui";
import { formatDate, fromNow } from "@/lib/relia/format";
import { getAsset, updateAssetStatus } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/assets/$assetId")({ component: AssetDetail });

function AssetDetail() {
  const { assetId } = Route.useParams();
  const { data, loading, error, reload } = useAsync(() => getAsset({ data: { id: assetId } }), [assetId]);

  if (loading) return <Skeleton className="h-80" />;
  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-fg-muted">Asset not found.</p>;
  const a = data.asset;

  return (
    <div>
      <Link to="/app/assets" className="mb-4 inline-block text-sm text-fg-muted hover:text-fg">
        ← Assets
      </Link>
      <PageHeader
        kicker={a.assetTag}
        title={a.name}
        description={`${a.siteName} · ${a.manufacturer} ${a.model}`.trim()}
        actions={
          <div className="flex items-center gap-2">
            <AssetStatusBadge status={a.status} />
            <CritBadge value={a.criticality} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-fg-subtle">Category</dt>
              <dd>{a.category}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">Serial</dt>
              <dd className="font-mono text-xs">{a.serialNo || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">Installed</dt>
              <dd>{formatDate(a.installedOn)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">Warranty</dt>
              <dd>{formatDate(a.warrantyUntil)}</dd>
            </div>
          </dl>
          {a.notes ? <p className="mt-4 text-sm text-fg-muted">{a.notes}</p> : null}
          <div className="mt-5 max-w-xs">
            <p className="mb-1 text-xs text-fg-subtle">Set status</p>
            <Select
              value={a.status}
              onChange={async (e) => {
                await updateAssetStatus({
                  data: { id: a.id, status: e.target.value as "running" },
                });
                reload();
              }}
            >
              <option value="running">Running</option>
              <option value="degraded">Degraded</option>
              <option value="down">Down</option>
              <option value="retired">Retired</option>
            </Select>
          </div>
        </section>

        <section className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
          <h2 className="mb-3 font-display text-2xl">PM plans</h2>
          <ul className="space-y-2 text-sm">
            {data.plans.length === 0 ? <li className="text-fg-muted">No plans.</li> : null}
            {data.plans.map((p) => (
              <li key={p.id}>
                {p.title}
                <span className={p.overdue ? "block text-xs text-danger" : "block text-xs text-fg-subtle"}>
                  {fromNow(p.nextDueAt)}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/app/pm">
            <Button variant="ghost" size="sm" className="mt-3 px-0">
              View all plans
            </Button>
          </Link>
        </section>
      </div>

      <section className="mt-6 rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
        <h2 className="mb-3 font-display text-2xl">Work history</h2>
        <ul className="divide-y divide-border">
          {data.work.map((wo) => (
            <li key={wo.id} className="flex items-center justify-between gap-3 py-3">
              <Link to="/app/work/$orderId" params={{ orderId: wo.id }} className="hover:text-accent">
                <span className="font-mono text-[11px] text-fg-subtle">{wo.number}</span>
                <span className="ml-2 text-sm">{wo.title}</span>
              </Link>
              <WoStatusBadge status={wo.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
