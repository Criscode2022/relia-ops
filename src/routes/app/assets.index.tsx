import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { AssetStatusBadge, CritBadge } from "@/components/status";
import { Button, Field, Input, Modal, Select, Skeleton } from "@/components/ui";
import { createAsset, listAssets, listSites } from "@/lib/relia/server";
import { useAsync } from "@/lib/relia/use-async";

export const Route = createFileRoute("/app/assets/")({ component: AssetsPage });

function AssetsPage() {
  const { data, loading, error, reload } = useAsync(() => listAssets(), []);
  const sites = useAsync(() => listSites(), []);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.assetTag.toLowerCase().includes(s) ||
        a.category.toLowerCase().includes(s),
    );
  }, [data, q]);

  return (
    <div>
      <PageHeader
        kicker="Plant"
        title="Assets"
        description="Pumps, blowers, generators, valves — criticality, status, and open work."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Register asset
          </Button>
        }
      />
      <Input
        className="mb-5 max-w-sm"
        placeholder="Search tag, name, category"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((a) => (
            <Link
              key={a.id}
              to="/app/assets/$assetId"
              params={{ assetId: a.id }}
              className="rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] text-fg-subtle">{a.assetTag}</p>
                  <h2 className="mt-1 text-base">{a.name}</h2>
                  <p className="text-xs text-fg-muted">
                    {a.siteName} · {a.category}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <AssetStatusBadge status={a.status} />
                  <CritBadge value={a.criticality} />
                </div>
              </div>
              <p className="mt-3 text-xs text-fg-subtle">{a.openWork} open work</p>
            </Link>
          ))}
        </div>
      )}

      <Modal open={open} title="Register asset" onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await createAsset({
              data: {
                siteId: String(fd.get("siteId")),
                name: String(fd.get("name")),
                assetTag: String(fd.get("assetTag")),
                category: String(fd.get("category")),
                manufacturer: String(fd.get("manufacturer") || ""),
                model: String(fd.get("model") || ""),
                serialNo: String(fd.get("serialNo") || ""),
                criticality: String(fd.get("criticality")) as "A",
                status: String(fd.get("status")) as "running",
                notes: String(fd.get("notes") || ""),
              },
            });
            setOpen(false);
            reload();
          }}
        >
          <Field label="Site">
            <Select name="siteId" required>
              {(sites.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tag">
              <Input name="assetTag" required placeholder="PMP-410" />
            </Field>
            <Field label="Category">
              <Input name="category" required placeholder="Pump" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Manufacturer">
              <Input name="manufacturer" />
            </Field>
            <Field label="Model">
              <Input name="model" />
            </Field>
          </div>
          <Field label="Serial">
            <Input name="serialNo" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Criticality">
              <Select name="criticality" defaultValue="B">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue="running">
                <option value="running">Running</option>
                <option value="degraded">Degraded</option>
                <option value="down">Down</option>
                <option value="retired">Retired</option>
              </Select>
            </Field>
          </div>
          <Button type="submit">Save asset</Button>
        </form>
      </Modal>
    </div>
  );
}
