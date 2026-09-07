import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Box,
  CalendarClock,
  ClipboardList,
  Factory,
  Gauge,
  MapPin,
  Menu,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Board", icon: Gauge, exact: true },
  { to: "/app/work", label: "Work orders", icon: ClipboardList },
  { to: "/app/assets", label: "Assets", icon: Factory },
  { to: "/app/pm", label: "Preventive", icon: CalendarClock },
  { to: "/app/parts", label: "Stores", icon: Box },
  { to: "/app/sites", label: "Sites", icon: MapPin },
  { to: "/app/crew", label: "Crew", icon: Users },
  { to: "/app/reports", label: "Reliability", icon: Activity },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm transition-colors duration-150",
              active
                ? "bg-bg-subtle text-fg"
                : "text-fg-muted hover:bg-bg-subtle/60 hover:text-fg",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, isPending } = useCurrentUserState();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border bg-bg-elevated px-3 py-5 md:flex">
        <Link to="/" className="mb-8 flex items-baseline gap-2 px-2">
          <span className="font-display text-2xl tracking-tight">Relia</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-fg-subtle">ops</span>
        </Link>
        <NavLinks />
        <div className="mt-auto border-t border-border px-2 pt-4">
          {isPending ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-bg-subtle" />
          ) : (
            <div className="flex items-center gap-2">
              <UserButton />
              <div className="min-w-0">
                <p className="truncate text-xs text-fg">{user?.displayName ?? "Operator"}</p>
                <p className="truncate text-[11px] text-fg-subtle">Riverside Water</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/app" className="font-display text-xl">
          Relia
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-border"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 bg-bg/95 p-4 md:hidden">
          <div className="mb-6 flex items-center justify-between">
            <span className="font-display text-2xl">Relia</span>
            <button
              type="button"
              aria-label="Close menu"
              className="flex size-11 items-center justify-center"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      ) : null}

      <main className="md:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
