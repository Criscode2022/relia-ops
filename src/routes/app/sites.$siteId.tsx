import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { AssetStatusBadge, CritBadge, WoStatusBadge } from "@/components/status";
import { Skeleton } from "@/components/ui";
import { KIND_LABEL } from "@/lib/relia/domain";
import { getSite } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/sites/$siteId")({ component: SiteDetail });

function SiteDetail() {
  const { siteId } = Route.useParams();
  const { data, loading, error } = useAsync(() => getSite({ data: { id: siteId } }), [siteId]);

  if (loading) return <Skeleton className="h-80" />;
  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-fg-muted">Site not found.</p>;
  const s = data.site;

  return (
    <div>
      <Link to="/app/sites" className="mb-4 inline-block text-sm text-fg-muted hover:text-fg">
        ← Sites
      </Link>
      <PageHeader
        kicker={s.code}
        title={s.name}
        description={`${s.city}, ${s.region} · ${KIND_LABEL[s.kind] ?? s.kind}`}
      />
      {s.notes ? <p className="mb-6 max-w-2xl text-sm text-fg-muted">{s.notes}</p> : null}

      <h2 className="mb-3 font-display text-2xl">Assets</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.assets.map((a) => (
          <Link
            key={a.id}
            to="/app/assets/$assetId"
            params={{ assetId: a.id }}
            className="rounded-[var(--radius-lg)] border border-border bg-bg-elevated p-4 hover:border-border-strong"
          >
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-mono text-[11px] text-fg-subtle">{a.assetTag}</p>
                <p>{a.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <AssetStatusBadge status={a.status} />
                <CritBadge value={a.criticality} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Recent work</h2>
      <ul className="divide-y divide-border rounded-[var(--radius-xl)] border border-border bg-bg-elevated px-4">
        {data.work.map((wo) => (
          <li key={wo.id} className="flex items-center justify-between py-3">
            <Link to="/app/work/$orderId" params={{ orderId: wo.id }} className="hover:text-accent">
              <span className="font-mono text-[11px] text-fg-subtle">{wo.number}</span>
              <span className="ml-2 text-sm">{wo.title}</span>
            </Link>
            <WoStatusBadge status={wo.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
