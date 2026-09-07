import { Badge } from "@/components/ui";
import { PRIORITY_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/lib/relia/domain";

export function WoStatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "ok"
      : status === "cancelled"
        ? "neutral"
        : status === "in_progress"
          ? "info"
          : status === "waiting_parts" || status === "open"
            ? "warn"
            : status === "assigned"
              ? "accent"
              : "neutral";
  return <Badge tone={tone}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function AssetStatusBadge({ status }: { status: string }) {
  const tone =
    status === "running" ? "ok" : status === "degraded" ? "warn" : status === "down" ? "danger" : "neutral";
  return <Badge tone={tone}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority === "p1" ? "danger" : priority === "p2" ? "warn" : "neutral";
  return <Badge tone={tone}>{PRIORITY_LABEL[priority] ?? priority}</Badge>;
}

export function TypeBadge({ type }: { type: string }) {
  const tone = type === "emergency" ? "danger" : type === "preventive" ? "info" : "neutral";
  return <Badge tone={tone}>{TYPE_LABEL[type] ?? type}</Badge>;
}

export function CritBadge({ value }: { value: string }) {
  const tone = value === "A" ? "danger" : value === "B" ? "warn" : "neutral";
  return <Badge tone={tone}>Crit {value}</Badge>;
}
