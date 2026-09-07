import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Field, Input, Modal, Skeleton } from "@/components/ui";
import { money } from "@/lib/relia/format";
import { adjustPartQty, createPart, listParts } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/parts")({ component: PartsPage });

function PartsPage() {
  const { data, loading, error, reload } = useAsync(() => listParts(), []);
  const [open, setOpen] = useState(false);
  const below = (data ?? []).filter((p) => p.belowMin).length;

  return (
    <div>
      <PageHeader
        kicker="Stores"
        title="Spare parts"
        description={
          below
            ? `${below} line${below === 1 ? "" : "s"} below minimum. Issue parts from the work order.`
            : "Stock versus minimum, with issue from each work order."
        }
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add part
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-border bg-bg-elevated text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Part</th>
                <th className="px-4 py-3 font-medium">On hand</th>
                <th className="px-4 py-3 font-medium">Min</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Bin</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">
                    {p.name}
                    <div className="text-xs text-fg-subtle">{p.category}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {p.qtyOnHand}{" "}
                    {p.belowMin ? (
                      <Badge tone="danger" className="ml-1">
                        Low
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-fg-muted">{p.minQty}</td>
                  <td className="px-4 py-3 tabular-nums text-fg-muted">{money(p.unitCost)}</td>
                  <td className="px-4 py-3 text-fg-muted">{p.location}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await adjustPartQty({ data: { id: p.id, delta: 1 } });
                          reload();
                        }}
                      >
                        +1
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await adjustPartQty({ data: { id: p.id, delta: -1 } });
                          reload();
                        }}
                      >
                        −1
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title="Add part" onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await createPart({
              data: {
                sku: String(fd.get("sku")),
                name: String(fd.get("name")),
                category: String(fd.get("category")),
                qtyOnHand: Number(fd.get("qtyOnHand") || 0),
                minQty: Number(fd.get("minQty") || 0),
                unitCost: Number(fd.get("unitCost") || 0),
                location: String(fd.get("location") || ""),
              },
            });
            setOpen(false);
            reload();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <Input name="sku" required />
            </Field>
            <Field label="Category">
              <Input name="category" required />
            </Field>
          </div>
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="On hand">
              <Input name="qtyOnHand" type="number" min={0} defaultValue={0} />
            </Field>
            <Field label="Min">
              <Input name="minQty" type="number" min={0} defaultValue={0} />
            </Field>
            <Field label="Unit cost">
              <Input name="unitCost" type="number" min={0} step="0.01" defaultValue={0} />
            </Field>
          </div>
          <Field label="Location">
            <Input name="location" placeholder="Cage A / Bin 12" />
          </Field>
          <Button type="submit">Save part</Button>
        </form>
      </Modal>
    </div>
  );
}
