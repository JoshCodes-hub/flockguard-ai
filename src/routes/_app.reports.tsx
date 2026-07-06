import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, FileText, Activity, BarChart3, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

type Farm = { id: string; farm_name: string; location: string | null; bird_type: string | null; bird_count: number };
type Prediction = {
  id: string; farm_id: string; prediction: string; confidence: number;
  risk_level: string; recommendation: string | null; prediction_source: string;
  is_verified: boolean; created_at: string;
};

const COLORS = { Healthy: "#2E7D32", "Newcastle Disease": "#E65100", "Avian Influenza": "#B71C1C", Inconclusive: "#757575" };

function ReportsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>("");
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [farmsRes, predsRes] = await Promise.all([
        supabase.from("farms").select("id, farm_name, location, bird_type, bird_count").order("created_at", { ascending: false }),
        supabase.from("predictions").select("id, farm_id, prediction, confidence, risk_level, recommendation, prediction_source, is_verified, created_at").order("created_at", { ascending: false }),
      ]);
      const fs = (farmsRes.data as Farm[]) ?? [];
      setFarms(fs);
      if (fs.length > 0) setSelectedFarm(fs[0].id);
      setPreds((predsRes.data as Prediction[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const farm = farms.find((f) => f.id === selectedFarm);
  const farmPreds = preds.filter((p) => p.farm_id === selectedFarm);

  // Stats
  const breakdown: Record<string, number> = {};
  farmPreds.forEach((p) => { breakdown[p.prediction] = (breakdown[p.prediction] ?? 0) + 1; });
  const breakdownData = Object.entries(breakdown).map(([name, value]) => ({ name, value }));

  const healthScore = farmPreds.length === 0 ? 100 :
    Math.round(100 - (farmPreds.filter((p) => p.risk_level === "High").length * 15 + farmPreds.filter((p) => p.risk_level === "Medium").length * 6) / farmPreds.length * 10);

  // Monthly trend
  const monthly: Record<string, { month: string; high: number; medium: number; low: number; total: number }> = {};
  farmPreds.forEach((p) => {
    const month = new Date(p.created_at).toLocaleString("en", { month: "short", year: "2-digit" });
    monthly[month] ??= { month, high: 0, medium: 0, low: 0, total: 0 };
    monthly[month].total++;
    if (p.risk_level === "High") monthly[month].high++;
    else if (p.risk_level === "Medium") monthly[month].medium++;
    else monthly[month].low++;
  });
  const monthlyData = Object.values(monthly).reverse();

  async function downloadPDF(report: "health" | "history" | "stats" | "monthly") {
    if (!farm) return;
    const { jsPDF } = await import("jspdf");
    const autoTableMod = await import("jspdf-autotable");
    const autoTable = autoTableMod.default;

    const doc = new jsPDF();
    const now = new Date().toLocaleString();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(46, 125, 50);
    doc.text("PoultryGuard", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${now}`, 14, 24);
    doc.setDrawColor(46, 125, 50);
    doc.line(14, 27, 196, 27);

    if (report === "health") {
      doc.setFontSize(16); doc.setTextColor(20);
      doc.text("Farm Health Report", 14, 40);
      doc.setFontSize(11);
      doc.text(`Farm: ${farm.farm_name}`, 14, 50);
      doc.text(`Location: ${farm.location ?? "—"}`, 14, 57);
      doc.text(`Bird Type: ${farm.bird_type ?? "—"}`, 14, 64);
      doc.text(`Bird Count: ${farm.bird_count}`, 14, 71);
      doc.text(`Health Score: ${healthScore}/100`, 14, 78);
      autoTable(doc, {
        startY: 90,
        head: [["Disease", "Cases"]],
        body: Object.entries(breakdown).map(([k, v]) => [k, String(v)]),
        styles: { font: "helvetica", fontSize: 10 },
        headStyles: { fillColor: [46, 125, 50] },
      });
    }
    if (report === "history") {
      doc.setFontSize(16); doc.text("Prediction History", 14, 40);
      doc.setFontSize(11); doc.text(`Farm: ${farm.farm_name}`, 14, 50);
      autoTable(doc, {
        startY: 58,
        head: [["Date", "Prediction", "Confidence", "Risk", "Source", "Verified"]],
        body: farmPreds.map((p) => [
          new Date(p.created_at).toLocaleDateString(),
          p.prediction,
          `${p.confidence}%`,
          p.risk_level,
          p.prediction_source,
          p.is_verified ? "Yes" : "No",
        ]),
        styles: { font: "helvetica", fontSize: 9 },
        headStyles: { fillColor: [46, 125, 50] },
      });
    }
    if (report === "stats") {
      doc.setFontSize(16); doc.text("Disease Statistics", 14, 40);
      doc.setFontSize(11); doc.text(`Farm: ${farm.farm_name}`, 14, 50);
      const total = farmPreds.length || 1;
      autoTable(doc, {
        startY: 58,
        head: [["Disease", "Cases", "% of Total"]],
        body: Object.entries(breakdown).map(([k, v]) => [k, String(v), `${Math.round((v / total) * 100)}%`]),
        styles: { font: "helvetica", fontSize: 10 },
        headStyles: { fillColor: [46, 125, 50] },
      });
    }
    if (report === "monthly") {
      doc.setFontSize(16); doc.text("Monthly Summary", 14, 40);
      doc.setFontSize(11); doc.text(`Farm: ${farm.farm_name}`, 14, 50);
      autoTable(doc, {
        startY: 58,
        head: [["Month", "Total", "High Risk", "Medium", "Low"]],
        body: monthlyData.map((m) => [m.month, String(m.total), String(m.high), String(m.medium), String(m.low)]),
        styles: { font: "helvetica", fontSize: 10 },
        headStyles: { fillColor: [46, 125, 50] },
      });
      const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
      doc.setFontSize(10); doc.setTextColor(80);
      doc.text("Recommendations:", 14, lastY + 12);
      doc.text("- Maintain consistent biosecurity routine.", 14, lastY + 19);
      doc.text("- Review vaccination calendar quarterly.", 14, lastY + 26);
      doc.text("- Investigate any month with >3 High-risk events.", 14, lastY + 33);
    }

    doc.save(`poultryguard-${report}-${farm.farm_name.replace(/\s+/g, "-")}.pdf`);
  }

  if (loading) return <div className="p-10 font-mono text-xs text-foreground/40 tracking-widest">LOADING REPORTS…</div>;

  if (farms.length === 0) {
    return (
      <div className="p-10 max-w-xl">
        <h1 className="font-display text-3xl mb-2">No farms yet</h1>
        <p className="text-foreground/60">Create a farm to start generating reports.</p>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50 mb-2">/ Reports</p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Reports & Analytics</h1>
          <p className="text-foreground/60 mt-2">Generate professional PDF reports for record-keeping, audits, and presentations.</p>
        </div>
        <select
          value={selectedFarm}
          onChange={(e) => setSelectedFarm(e.target.value)}
          className="border border-border bg-background px-3 py-2 rounded-sm text-sm"
        >
          {farms.map((f) => (
            <option key={f.id} value={f.id}>{f.farm_name}</option>
          ))}
        </select>
      </header>

      {farm && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Stat label="Health Score" value={`${healthScore}/100`} accent />
            <Stat label="Total Birds" value={String(farm.bird_count)} />
            <Stat label="Total Predictions" value={String(farmPreds.length)} />
            <Stat label="High-Risk Events" value={String(farmPreds.filter((p) => p.risk_level === "High").length)} />
          </div>

          <div className="grid lg:grid-cols-4 gap-4 mb-10">
            <ReportCard icon={Activity} title="Farm Health Report" desc="Snapshot of farm status, bird count, and aggregate health score." onClick={() => downloadPDF("health")} />
            <ReportCard icon={FileText} title="Prediction History" desc="Full chronological log of every prediction with confidence and risk." onClick={() => downloadPDF("history")} />
            <ReportCard icon={BarChart3} title="Disease Statistics" desc="Per-disease breakdown with percentage distribution." onClick={() => downloadPDF("stats")} />
            <ReportCard icon={Calendar} title="Monthly Summary" desc="Risk trends per month with recommendations." onClick={() => downloadPDF("monthly")} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Disease Distribution">
              {breakdownData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {breakdownData.map((d) => (
                        <Cell key={d.name} fill={COLORS[d.name as keyof typeof COLORS] ?? "#888"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Monthly Risk Trend">
              {monthlyData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="high" stroke="#B71C1C" strokeWidth={2} />
                    <Line type="monotone" dataKey="medium" stroke="#E65100" strokeWidth={2} />
                    <Line type="monotone" dataKey="low" stroke="#2E7D32" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Confidence by Prediction" full>
              {farmPreds.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={farmPreds.slice(0, 20).map((p) => ({ name: new Date(p.created_at).toLocaleDateString(), value: p.confidence, fill: COLORS[p.prediction as keyof typeof COLORS] ?? "#888" }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-5 border border-border rounded-sm bg-card">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50">{label}</p>
      <p className={`font-display text-4xl tracking-tight mt-1 ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function ReportCard({ icon: Icon, title, desc, onClick }: { icon: typeof Activity; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left p-5 border border-border rounded-sm bg-card hover:border-primary transition-colors group">
      <Icon className="size-5 text-primary mb-3" />
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-xs text-foreground/60 mb-3">{desc}</p>
      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary">
        <Download className="size-3" /> Download PDF
      </span>
    </button>
  );
}

function ChartCard({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`p-5 border border-border rounded-sm bg-card ${full ? "lg:col-span-2" : ""}`}>
      <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="h-[260px] grid place-items-center text-foreground/40 text-sm">No data yet</div>;
}
