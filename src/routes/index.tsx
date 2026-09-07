import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3, Shield, Wrench } from "lucide-react";
import { Button } from "@/components/ui";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function AuthCta() {
  const { isPending } = useCurrentUserState();
  if (isPending) return <div className="h-12 w-40 animate-pulse rounded-[var(--radius-md)] bg-bg-subtle" />;
  return (
    <>
      <SignedIn>
        <Link to="/app">
          <Button size="lg">
            Open the board <ArrowRight className="size-4" />
          </Button>
        </Link>
      </SignedIn>
      <SignedOut>
        <Link to="/login">
          <Button size="lg">
            Sign in to Relia <ArrowRight className="size-4" />
          </Button>
        </Link>
      </SignedOut>
    </>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-2xl tracking-tight">Relia</span>
        <nav className="flex items-center gap-4 text-sm text-fg-muted">
          <a href="#desk" className="hidden sm:inline hover:text-fg">
            The desk
          </a>
          <Link to="/login" className="hover:text-fg">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:pt-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-fg-subtle">
          Maintenance operations
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.12] tracking-tight md:text-6xl">
          The control room for every asset you cannot afford to fail.
        </h1>
        <p className="mt-5 max-w-xl text-base text-fg-muted md:text-lg">
          Relia is a computerized maintenance desk for plants, pump stations, and facilities
          teams. Work orders, preventive plans, spare parts, and downtime — one quiet board.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <AuthCta />
          <a href="#desk" className="text-sm text-fg-muted hover:text-fg">
            See the operations desk
          </a>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-border pt-8 md:grid-cols-4">
          {[
            ["PM compliance", "On-time plans, not tribal knowledge"],
            ["MTTR", "How long assets stay down"],
            ["Stores", "Min-stock before the job stalls"],
            ["Emergency work", "P1 visible the moment it lands"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-display text-xl">{k}</dt>
              <dd className="mt-1 text-sm text-fg-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="desk" className="border-t border-border bg-bg-elevated py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-fg-subtle">The board</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
              What is overdue, what is down, who is on it.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-fg-muted">
              Built for a water treatment plant on the Willamette — and for any site with pumps,
              blowers, generators, and a crew that cannot hunt through spreadsheets at 02:00.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-fg-muted">
              <li className="flex gap-3">
                <Wrench className="mt-0.5 size-4 text-accent" strokeWidth={1.75} />
                Work orders with a real status machine, parts issue, and a job log.
              </li>
              <li className="flex gap-3">
                <Clock3 className="mt-0.5 size-4 text-accent" strokeWidth={1.75} />
                Preventive plans that raise work when they slip.
              </li>
              <li className="flex gap-3">
                <Shield className="mt-0.5 size-4 text-accent" strokeWidth={1.75} />
                Per-account isolation. Your plant is not mixed with anyone else’s.
              </li>
            </ul>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-border bg-bg p-4 shadow-[var(--shadow-panel)]">
            <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
              <span>Riverside Water · live</span>
              <span className="text-danger">1 asset down</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["7", "Open work"],
                ["2", "Overdue PM"],
                ["3", "Below min"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-[var(--radius-md)] bg-bg-subtle px-2 py-4">
                  <div className="font-display text-2xl tabular-nums">{n}</div>
                  <div className="mt-1 text-[11px] text-fg-muted">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["REL-1036", "Blower 3 high temp trip", "P1"],
                ["REL-1037", "PMP-402 packing replacement", "Parts"],
                ["REL-1042", "Historian backup overdue", "PM"],
              ].map(([n, t, s]) => (
                <div
                  key={n}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border px-3 py-2.5"
                >
                  <div>
                    <div className="font-mono text-[11px] text-fg-subtle">{n}</div>
                    <div className="text-sm">{t}</div>
                  </div>
                  <span className="text-[11px] text-fg-muted">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-5 py-8 text-sm text-fg-subtle">
        <span>Relia · reliability operations</span>
        <Link to="/login" className="hover:text-fg">
          Sign in
        </Link>
      </footer>
    </div>
  );
}
