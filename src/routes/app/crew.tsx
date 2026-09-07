import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Field, Input, Modal, Select, Skeleton } from "@/components/ui";
import { TRADE_LABEL } from "@/lib/relia/domain";
import { createTechnician, listTechnicians } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/crew")({ component: CrewPage });

function CrewPage() {
  const { data, loading, error, reload } = useAsync(() => listTechnicians(), []);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        kicker="People"
        title="Crew"
        description="Trades on this plant. Assign them from a work order."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add technician
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-48" />
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(data ?? []).map((t) => (
            <article key={t.id} className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">{t.name}</h2>
                  <p className="text-sm text-fg-muted">{t.role}</p>
                </div>
                <Badge>{TRADE_LABEL[t.trade] ?? t.trade}</Badge>
              </div>
              <p className="mt-3 text-xs text-fg-subtle">
                {t.email || "No email"} · {t.openWork} open jobs
              </p>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title="Add technician" onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await createTechnician({
              data: {
                name: String(fd.get("name")),
                trade: String(fd.get("trade")) as "mechanical",
                role: String(fd.get("role")),
                email: String(fd.get("email") || ""),
                phone: String(fd.get("phone") || ""),
              },
            });
            setOpen(false);
            reload();
          }}
        >
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trade">
              <Select name="trade" defaultValue="mechanical">
                <option value="mechanical">Mechanical</option>
                <option value="electrical">Electrical</option>
                <option value="instrumentation">Instrumentation</option>
                <option value="general">General</option>
              </Select>
            </Field>
            <Field label="Role">
              <Input name="role" required placeholder="Millwright" />
            </Field>
          </div>
          <Field label="Email">
            <Input name="email" type="email" />
          </Field>
          <Field label="Phone">
            <Input name="phone" />
          </Field>
          <Button type="submit">Save</Button>
        </form>
      </Modal>
    </div>
  );
}
