import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Skeleton } from "@/components/ui";
import { fromNow } from "@/lib/relia/format";
import { generatePmWorkOrder, listPmPlans } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";
import { useState } from "react";

export const Route = createFileRoute("/app/pm")({ component: PmPage });

function PmPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => listPmPlans(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        kicker="Reliability"
        title="Preventive plans"
        description="Frequency, next due, and one-click raise of a work order when a plan slips."
      />
      {msg ? <p className="mb-4 text-sm text-fg-muted">{msg}</p> : null}
      {loading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-border bg-bg-elevated text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Every</th>
                <th className="px-4 py-3 font-medium">Next due</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    {p.title}
                    {p.overdue ? (
                      <Badge tone="danger" className="ml-2">
                        Overdue
                      </Badge>
                    ) : null}
                    <p className="text-xs text-fg-subtle">{p.checklist}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/app/assets/$assetId"
                      params={{ assetId: p.assetId }}
                      className="hover:text-accent"
                    >
                      {p.assetTag}
                    </Link>
                    <div className="text-xs text-fg-muted">{p.siteName}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-fg-muted">{p.frequencyDays} days</td>
                  <td className={p.overdue ? "px-4 py-3 text-danger" : "px-4 py-3 text-fg-muted"}>
                    {fromNow(p.nextDueAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === p.id}
                      onClick={async () => {
                        setBusy(p.id);
                        setMsg(null);
                        try {
                          const res = await generatePmWorkOrder({ data: { planId: p.id } });
                          reload();
                          await navigate({ to: "/app/work/$orderId", params: { orderId: res.id } });
                        } catch (err) {
                          setMsg(err instanceof Error ? err.message : "Could not generate");
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      Raise WO
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
