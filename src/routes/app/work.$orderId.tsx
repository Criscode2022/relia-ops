import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, TypeBadge, WoStatusBadge } from "@/components/status";
import { Button, Field, Input, Select, Skeleton, Textarea } from "@/components/ui";
import { nextActions, STATUS_LABEL } from "@/lib/relia/domain";
import { formatDateTime, money } from "@/lib/relia/format";
import {
  addWoComment,
  consumePartOnWo,
  getWorkOrder,
  listParts,
  listTechnicians,
  transitionWorkOrder,
} from "@/lib/relia/server";
import type { WoStatus } from "@/lib/relia/types";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/work/$orderId")({ component: WorkDetail });

function WorkDetail() {
  const { orderId } = Route.useParams();
  const { data, loading, error, reload } = useAsync(() => getWorkOrder({ data: { id: orderId } }), [orderId]);
  const crew = useAsync(() => listTechnicians(), []);
  const parts = useAsync(() => listParts(), []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [hours, setHours] = useState("");
  const [down, setDown] = useState("");

  if (loading) return <Skeleton className="h-96" />;
  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-fg-muted">Work order not found.</p>;

  const wo = data.workOrder;
  const actions = nextActions(wo.status);

  async function act(status: WoStatus, extra?: { technicianId?: string; laborHours?: number; downtimeMinutes?: number }) {
    setBusy(true);
    setMsg(null);
    try {
      await transitionWorkOrder({
        data: {
          id: wo.id,
          status,
          technicianId: extra?.technicianId ?? wo.technicianId,
          laborHours: extra?.laborHours,
          downtimeMinutes: extra?.downtimeMinutes,
        },
      });
      reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link to="/app/work" className="mb-4 inline-block text-sm text-fg-muted hover:text-fg">
        ← Work orders
      </Link>
      <PageHeader
        kicker={wo.number}
        title={wo.title}
        description={`${wo.assetTag} · ${wo.assetName} · ${wo.siteName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={wo.priority} />
            <TypeBadge type={wo.type} />
            <WoStatusBadge status={wo.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
            <h2 className="mb-3 font-display text-2xl">Job</h2>
            <p className="whitespace-pre-wrap text-sm text-fg-muted">{wo.description || "No description."}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs text-fg-subtle">Due</dt>
                <dd>{formatDateTime(wo.dueAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Started</dt>
                <dd>{formatDateTime(wo.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Labor</dt>
                <dd className="tabular-nums">{wo.laborHours} h</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Downtime</dt>
                <dd className="tabular-nums">{wo.downtimeMinutes} min</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
            <h2 className="mb-3 font-display text-2xl">Log</h2>
            <ul className="space-y-3">
              {data.comments.map((c) => (
                <li key={c.id} className="border-b border-border pb-3 last:border-0">
                  <p className="text-xs text-fg-subtle">
                    {c.authorName} · {formatDateTime(c.createdAt)}
                  </p>
                  <p className="mt-1 text-sm">{c.body}</p>
                </li>
              ))}
            </ul>
            <form
              className="mt-4 grid gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const body = String(fd.get("body") || "").trim();
                if (!body) return;
                await addWoComment({ data: { workOrderId: wo.id, body } });
                e.currentTarget.reset();
                reload();
              }}
            >
              <Textarea name="body" placeholder="Add a note for the next shift" required />
              <Button type="submit" variant="secondary" size="sm" className="justify-self-start">
                Add note
              </Button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
            <h2 className="mb-3 font-display text-2xl">Move</h2>
            <Field label="Technician">
              <Select
                value={wo.technicianId ?? ""}
                onChange={(e) => {
                  const technicianId = e.target.value || undefined;
                  if (technicianId && wo.status === "open") act("assigned", { technicianId });
                }}
              >
                <option value="">Unassigned</option>
                {(crew.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            {msg ? <p className="mt-2 text-sm text-danger">{msg}</p> : null}
            {actions.includes("completed") ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field label="Labor hours">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={hours}
                    placeholder={String(wo.laborHours || 1)}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </Field>
                <Field label="Downtime min">
                  <Input
                    type="number"
                    min={0}
                    value={down}
                    placeholder={String(wo.downtimeMinutes || 0)}
                    onChange={(e) => setDown(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
            <div className="mt-3 flex flex-col gap-2">
              {actions.map((s) => (
                <Button
                  key={s}
                  variant={s === "cancelled" ? "ghost" : s === "completed" ? "primary" : "secondary"}
                  disabled={busy}
                  onClick={() => {
                    if (s === "completed") {
                      act(s, {
                        laborHours: Number(hours || wo.laborHours || 1),
                        downtimeMinutes: Number(down || wo.downtimeMinutes || 0),
                      });
                    } else {
                      act(s);
                    }
                  }}
                >
                  {STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
            <h2 className="mb-3 font-display text-2xl">Parts issued</h2>
            <ul className="space-y-2 text-sm">
              {data.parts.length === 0 ? <li className="text-fg-muted">None yet.</li> : null}
              {data.parts.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span>
                    {p.qty} × {p.name}
                    <span className="block text-[11px] text-fg-subtle">{p.sku}</span>
                  </span>
                  <span className="tabular-nums text-fg-muted">{money(p.qty * p.unitCost)}</span>
                </li>
              ))}
            </ul>
            <form
              className="mt-4 grid gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await consumePartOnWo({
                    data: {
                      workOrderId: wo.id,
                      partId: String(fd.get("partId")),
                      qty: Number(fd.get("qty") || 1),
                    },
                  });
                  reload();
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "Could not issue part");
                }
              }}
            >
              <Select name="partId" required>
                {(parts.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.qtyOnHand} on hand
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Input name="qty" type="number" min={1} defaultValue={1} className="w-24" />
                <Button type="submit" variant="secondary" size="sm">
                  Issue
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
