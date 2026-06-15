import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Leaf, Stethoscope, Upload, Radio, LogOut, Menu, X, Sparkles, BookOpen, Bell, Shield, FileText, Database, FlaskConical, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/farms", label: "Farms", icon: Leaf },
  { to: "/health-record/new", label: "Health Record", icon: Stethoscope },
  { to: "/image-analysis", label: "Image Analysis", icon: Upload },
  { to: "/vet", label: "Vet Review", icon: ClipboardCheck },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/dataset", label: "Dataset", icon: Database },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/iot", label: "IoT Sensors", icon: Radio },
  { to: "/admin", label: "Admin", icon: Shield },
  { to: "/demo", label: "Demo Data", icon: FlaskConical },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) navigate({ to: "/auth" });
      else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!ready) return <div className="min-h-screen grid place-items-center text-foreground/40 font-mono text-xs">LOADING…</div>;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform`}>
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <Link to="/dashboard" className="font-extrabold tracking-tighter text-lg uppercase">PoultryGuard<span className="text-primary-soft">AI</span></Link>
          <button onClick={() => setOpen(false)} className="md:hidden text-sidebar-foreground/60"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest transition-colors ${active ? "bg-sidebar-accent text-primary-soft" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button onClick={signOut} variant="ghost" className="w-full justify-start text-xs font-bold uppercase tracking-widest text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-sm">
            <LogOut className="size-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-20">
          <button onClick={() => setOpen(true)}><Menu className="size-5" /></button>
          <span className="font-extrabold tracking-tighter uppercase">PoultryGuard<span className="text-primary">AI</span></span>
          <div className="w-5" />
        </header>
        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
