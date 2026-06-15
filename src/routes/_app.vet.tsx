import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bulkVerifyPredictions } from "@/lib/predictions.functions";
import { ShieldCheck, Stethoscope, AlertCircle, Filter } from "lucide-react";

export const Route = createFileRoute("/_app/vet")({
  head: () => ({ meta: [{ title: "Veterinarian Review — PoultryGuard AI" }] }),
  component: VetPortal,
});

type Row = {
  id: string;
  farm_id: string;
  prediction: string;
  confidence: number;
  risk_level: string;
  prediction_source: string;
  recommendation: string | null;
  is_verified: boolean;
  created_at: string;
  farms?: { farm_name: string } | null;
};

function VetPortal() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bulkFn = useServerFn(bulkVerifyPredictions);
  const [risk, setRisk] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [source, setSource] = useState<"all" | "vision_ai" | "cdse">("all");
  const [status, setStatus] = useState<"unverified" | "verified" | "all">("unverified");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Role guard
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["myRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role as string);
      return { roles, allowed: roles.includes("veterinarian") || roles.includes("admin") };
    },
  });

  useEffect(() => {
    if (!roleLoading && roleData && !roleData.allowed) {
      toast.error("Veterinarian or admin role required");
      navigate({ to: "/dashboard" });
    }
  }, [roleData, roleLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["vet-queue", status],
    enabled: !!roleData?.allowed,
    queryFn: async () => {
      let q = supabase
        .from("predictions")
        .select("id, farm_id, prediction, confidence, risk_level, prediction_source, recommendation, is_verified, created_at, farms(farm_name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (status === "unverified") q = q.eq("is_verified", false);
      if (status === "verified") q = q.eq("is_verified", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    const all = data ?? [];
    return all.filter((r) =>
      (risk === "all" || r.risk_level === risk) &&
      (source === "all" || r.prediction_source === source),
    );
  }, [data, risk, source]);

  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      high: all.filter((r) => r.risk_level === "High").length,
      medium: all.filter((r) => r.risk_level === "Medium").length,
      low: all.filter((r) => r.risk_level === "Low").length,
    };
  }, [data]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  async function bulk(is_verified: boolean) {
    if (selected.size === 0) { toast.error("Select at least one prediction"); return; }
    setBusy(true);
    try {
      const res = await bulkFn({ data: { prediction_ids: Array.from(selected), is_verified } });
      toast.success(`${is_verified ? "Verified" : "Marked unverified"} ${res.count} prediction${res.count === 1 ? "" : "s"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["vet-queue"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBusy(false);
    }
  }

  if (roleLoading || !roleData?.allowed) {
    return <div className="p-10 text-foreground/40 font-mono text-xs">LOADING…</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">CLINICAL REVIEW</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter flex items-center gap-3">
            <Stethoscope className="size-8 text-primary" /> Veterinarian Portal
          </h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">Review AI predictions across all farms. Verified cases feed the next-generation training dataset.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="IN QUEUE" value={stats.total} />
        <Stat label="HIGH RISK" value={stats.high} accent="danger" />
        <Stat label="MEDIUM RISK" value={stats.medium} accent="warning" />
        <Stat label="LOW RISK" value={stats.low} accent="primary" />
      </div>

      <div className="bg-surface border border-border p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="size-4 text-foreground/40" />
          <Select label="Status" value={status} onChange={(v) => setStatus(v as typeof status)} options={[
            { v: "unverified", l: "Unverified" }, { v: "verified", l: "Verified" }, { v: "all", l: "All" },
          ]} />
          <Select label="Risk" value={risk} onChange={(v) => setRisk(v as typeof risk)} options={[
            { v: "all", l: "All risks" }, { v: "High", l: "High" }, { v: "Medium", l: "Medium" }, { v: "Low", l: "Low" },
          ]} />
          <Select label="Source" value={source} onChange={(v) => setSource(v as typeof source)} options={[
            { v: "all", l: "All sources" }, { v: "cdse", l: "CDSE" }, { v: "vision_ai", l: "Vision AI" },
          ]} />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <span className="text-xs font-mono text-foreground/50 uppercase tracking-widest">{selected.size} selected</span>
          <button disabled={busy || selected.size === 0} onClick={() => bulk(true)} className="px-3 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-sm inline-flex items-center gap-2 disabled:opacity-40">
            <ShieldCheck className="size-3.5" /> Verify
          </button>
          <button disabled={busy || selected.size === 0} onClick={() => bulk(false)} className="px-3 py-2 border border-border text-xs font-bold uppercase tracking-widest rounded-sm disabled:opacity-40">
            Unverify
          </button>
        </div>
      </div>


      <div className="bg-surface border border-border overflow-x-auto">
        {isLoading ? (
          <p className="p-8 text-sm text-foreground/40 font-mono">LOADING…</p>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="size-8 text-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-foreground/60">No predictions match the current filters.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] text-foreground/40 uppercase">
                <th className="py-3 px-4 w-10">
                  <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} />
                </th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Farm</th>
                <th className="py-3 pr-4">Prediction</th>
                <th className="py-3 pr-4">Conf.</th>
                <th className="py-3 pr-4">Risk</th>
                <th className="py-3 pr-4">Source</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-primary-soft/10">
                  <td className="py-3 px-4">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs opacity-60">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-3 pr-4 text-xs">{r.farms?.farm_name ?? "—"}</td>
                  <td className="py-3 pr-4 font-bold">{r.prediction}</td>
                  <td className="py-3 pr-4 font-mono">{Number(r.confidence).toFixed(0)}%</td>
                  <td className="py-3 pr-4"><RiskBadge level={r.risk_level} /></td>
                  <td className="py-3 pr-4 text-xs uppercase font-mono opacity-60">{r.prediction_source === "vision_ai" ? "Vision AI" : "CDSE"}</td>
                  <td className="py-3 pr-4 text-xs">
                    {r.is_verified ? (
                      <span className="text-primary inline-flex items-center gap-1"><ShieldCheck className="size-3" /> Verified</span>
                    ) : (
                      <span className="text-foreground/40 font-mono uppercase tracking-widest text-[10px]">Pending</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Link to="/predictions/$id" params={{ id: r.id }} className="text-[10px] font-mono border border-border px-2 py-1 uppercase tracking-widest hover:bg-background">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "primary" | "warning" | "danger" }) {
  const color = accent === "primary" ? "text-primary" : accent === "danger" ? "text-destructive" : accent === "warning" ? "text-warning" : "";
  return (
    <div className="bg-background border border-border p-5">
      <p className="font-mono text-[10px] text-foreground/40 mb-3 tracking-widest">{label}</p>
      <div className={`text-3xl font-extrabold tracking-tighter ${color}`}>{String(value).padStart(2, "0")}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-background border border-border px-2 py-1.5 text-xs font-mono">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

function RiskBadge({ level }: { level: string }) {
  const map = { High: "bg-destructive/10 text-destructive", Medium: "bg-warning/10 text-warning", Low: "bg-primary-soft text-primary" } as const;
  const cls = map[level as keyof typeof map] ?? "bg-muted text-foreground/60";
  return <span className={`${cls} px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-tighter`}>{level}</span>;
}
