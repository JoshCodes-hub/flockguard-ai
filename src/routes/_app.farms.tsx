import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Leaf, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/farms")({
  head: () => ({ meta: [{ title: "Farms — PoultryGuard AI" }] }),
  component: Farms,
});

function Farms() {
  const qc = useQueryClient();
  const { data: farms, isLoading } = useQuery({
    queryKey: ["farms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("farms").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ farm_name: "", location: "", bird_type: "Layer", bird_count: "0" });
  const [saving, setSaving] = useState(false);

  async function createFarm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return toast.error("Not signed in"); }
    const { error } = await supabase.from("farms").insert({
      user_id: user.id,
      farm_name: form.farm_name,
      location: form.location,
      bird_type: form.bird_type,
      bird_count: parseInt(form.bird_count || "0", 10),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Farm created");
    setForm({ farm_name: "", location: "", bird_type: "Layer", bird_count: "0" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["farms"] });
  }

  async function deleteFarm(id: string) {
    if (!confirm("Delete this farm and all its records?")) return;
    const { error } = await supabase.from("farms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Farm deleted");
    qc.invalidateQueries({ queryKey: ["farms"] });
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">FARM MANAGEMENT</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">Your Farms</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-sm text-xs font-bold uppercase tracking-widest"><Plus className="size-4 mr-2" /> Add Farm</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Farm</DialogTitle></DialogHeader>
            <form onSubmit={createFarm} className="space-y-4">
              <div><Label>Farm Name</Label><Input required value={form.farm_name} onChange={(e) => setForm({ ...form, farm_name: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Bird Type</Label><Input value={form.bird_type} onChange={(e) => setForm({ ...form, bird_type: e.target.value })} placeholder="Layer / Broiler" /></div>
                <div><Label>Bird Count</Label><Input type="number" min={0} value={form.bird_count} onChange={(e) => setForm({ ...form, bird_count: e.target.value })} /></div>
              </div>
              <DialogFooter><Button type="submit" disabled={saving} className="rounded-sm">Create</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="font-mono text-xs text-foreground/40">LOADING…</p>
      ) : !farms || farms.length === 0 ? (
        <div className="bg-surface border border-border p-12 text-center">
          <Leaf className="size-10 text-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-foreground/60 mb-4">No farms yet. Create one to start tracking flock health.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map((f) => (
            <div key={f.id} className="bg-background border border-border p-6 group">
              <div className="flex justify-between items-start mb-4">
                <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">{f.bird_type}</p>
                <button onClick={() => deleteFarm(f.id)} className="text-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="size-4" /></button>
              </div>
              <Link to="/farms/$farmId" params={{ farmId: f.id }} className="block">
                <h3 className="text-2xl font-extrabold tracking-tighter mb-1 hover:text-primary transition-colors">{f.farm_name}</h3>
                <p className="text-xs text-foreground/60 mb-6">{f.location || "—"}</p>
                <div className="text-4xl font-extrabold tracking-tighter">{f.bird_count.toLocaleString()}<span className="text-xs text-foreground/40 ml-2 font-normal">BIRDS</span></div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
