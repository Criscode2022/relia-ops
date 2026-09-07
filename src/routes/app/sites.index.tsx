import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Field, Input, Modal, Select, Skeleton } from "@/components/ui";
import { KIND_LABEL } from "@/lib/relia/domain";
import { createSite, listSites } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/sites/")({ component: SitesPage });

function SitesPage() {
  const { data, loading, error, reload } = useAsync(() => listSites(), []);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        kicker="Network"
        title="Sites"
        description="Plants, pump stations, and campuses in this workspace."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add site
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-48" />
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((s) => (
            <Link
              key={s.id}
              to="/app/sites/$siteId"
              params={{ siteId: s.id }}
              className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 hover:border-border-strong"
            >
              <p className="font-mono text-[11px] text-fg-subtle">{s.code}</p>
              <h2 className="mt-1 font-display text-2xl">{s.name}</h2>
              <p className="mt-1 text-sm text-fg-muted">
                {s.city}, {s.region} · {KIND_LABEL[s.kind] ?? s.kind}
              </p>
              <p className="mt-4 text-xs text-fg-subtle">
                {s.assetCount} assets · {s.openWork} open work
              </p>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} title="Add site" onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await createSite({
              data: {
                name: String(fd.get("name")),
                code: String(fd.get("code")),
                city: String(fd.get("city")),
                region: String(fd.get("region")),
                kind: String(fd.get("kind")) as "plant",
                notes: String(fd.get("notes") || ""),
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
            <Field label="Code">
              <Input name="code" required maxLength={8} />
            </Field>
            <Field label="Kind">
              <Select name="kind" defaultValue="plant">
                <option value="plant">Treatment plant</option>
                <option value="pump_station">Pump station</option>
                <option value="campus">Campus</option>
                <option value="warehouse">Warehouse</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <Input name="city" required />
            </Field>
            <Field label="Region">
              <Input name="region" required />
            </Field>
          </div>
          <Button type="submit">Save site</Button>
        </form>
      </Modal>
    </div>
  );
}
