import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, TypeBadge, WoStatusBadge } from "@/components/status";
import { Button, Field, Input, Modal, Select, Skeleton, Textarea } from "@/components/ui";
import { fromNow } from "@/lib/relia/format";
import { createWorkOrder, listAssets, listTechnicians, listWorkOrders } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/work/")({ component: WorkList });

function WorkList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("openish");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filterStatus = status === "openish" || status === "all" ? "all" : status;
  const { data, loading, error, reload } = useAsync(
    () => listWorkOrders({ data: { status: filterStatus, type } }),
    [filterStatus, type],
  );
  const assets = useAsync(() => listAssets(), []);
  const crew = useAsync(() => listTechnicians(), []);

  const rows = useMemo(() => {
    let list = data ?? [];
    if (status === "openish") {
      list = list.filter((w) => w.status !== "completed" && w.status !== "cancelled");
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(s) ||
          w.number.toLowerCase().includes(s) ||
          w.assetTag.toLowerCase().includes(s),
      );
    }
    return list;
  }, [data, status, q]);

  return (
    <div>
      <PageHeader
        kicker="Work"
        title="Work orders"
        description="Corrective, preventive, emergency, and inspection work across every site."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New work
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search number, title, tag"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:max-w-44">
          <option value="openish">Active</option>
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="waiting_parts">Waiting parts</option>
          <option value="completed">Completed</option>
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:max-w-44">
          <option value="all">All types</option>
          <option value="emergency">Emergency</option>
          <option value="corrective">Corrective</option>
          <option value="preventive">Preventive</option>
          <option value="inspection">Inspection</option>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-bg-elevated text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Crew</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((wo) => (
                <tr key={wo.id} className="border-b border-border last:border-0 hover:bg-bg-elevated/60">
                  <td className="px-4 py-3">
                    <Link to="/app/work/$orderId" params={{ orderId: wo.id }} className="hover:text-accent">
                      <div className="font-mono text-[11px] text-fg-subtle">{wo.number}</div>
                      <div>{wo.title}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {wo.assetTag}
                    <div className="text-xs">{wo.siteName}</div>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{wo.technicianName ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-fg-muted">{fromNow(wo.dueAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <PriorityBadge priority={wo.priority} />
                      <TypeBadge type={wo.type} />
                      <WoStatusBadge status={wo.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateWork
        open={open}
        onClose={() => setOpen(false)}
        assets={assets.data ?? []}
        crew={crew.data ?? []}
        onCreated={async (id) => {
          setOpen(false);
          reload();
          await navigate({ to: "/app/work/$orderId", params: { orderId: id } });
        }}
      />
    </div>
  );
}

function CreateWork({
  open,
  onClose,
  assets,
  crew,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  assets: Awaited<ReturnType<typeof listAssets>>;
  crew: Awaited<ReturnType<typeof listTechnicians>>;
  onCreated: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const tech = String(fd.get("technicianId") || "");
      const due = String(fd.get("dueAt") || "");
      const res = await createWorkOrder({
        data: {
          assetId: String(fd.get("assetId")),
          title: String(fd.get("title")),
          description: String(fd.get("description") || ""),
          type: String(fd.get("type")) as "corrective" | "preventive" | "emergency" | "inspection",
          priority: String(fd.get("priority")) as "p1" | "p2" | "p3" | "p4",
          technicianId: tech || null,
          dueAt: due ? new Date(due).toISOString() : null,
        },
      });
      onCreated(res.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Raise work" onClose={onClose}>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Field label="Asset">
          <Select name="assetId" required>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.assetTag} · {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title">
          <Input name="title" required minLength={4} placeholder="What needs doing" />
        </Field>
        <Field label="Description">
          <Textarea name="description" placeholder="Symptoms, isolation, constraints" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select name="type" defaultValue="corrective">
              <option value="emergency">Emergency</option>
              <option value="corrective">Corrective</option>
              <option value="preventive">Preventive</option>
              <option value="inspection">Inspection</option>
            </Select>
          </Field>
          <Field label="Priority">
            <Select name="priority" defaultValue="p3">
              <option value="p1">P1 Critical</option>
              <option value="p2">P2 High</option>
              <option value="p3">P3 Medium</option>
              <option value="p4">P4 Low</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assign">
            <Select name="technicianId" defaultValue="">
              <option value="">Unassigned</option>
              {crew.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due">
            <Input name="dueAt" type="datetime-local" />
          </Field>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Create order"}
        </Button>
      </form>
    </Modal>
  );
}
