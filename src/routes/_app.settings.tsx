import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, KeyRound, Mail, Shield } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — PoultryGuard" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, farm_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return {
        email: user.email ?? "",
        userId: user.id,
        profile: profile ?? { full_name: "", phone: "", farm_name: "" },
        roles: (roles ?? []).map((r) => r.role as string),
      };
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [farmName, setFarmName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setFullName(data.profile.full_name ?? "");
      setPhone(data.profile.phone ?? "");
      setFarmName(data.profile.farm_name ?? "");
    }
  }, [data?.profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    if (fullName.trim().length > 120 || phone.trim().length > 40 || farmName.trim().length > 120) {
      toast.error("One or more fields are too long"); return;
    }
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert({
      id: data.userId,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      farm_name: farmName.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSavingProfile(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  }

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    setNewPw(""); setConfirmPw("");
  }

  if (isLoading || !data) {
    return <div className="p-10 text-foreground/40 font-mono text-xs">LOADING…</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8 max-w-4xl">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">ACCOUNT</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">Settings</h1>
        <p className="text-sm text-foreground/60 mt-2">Manage your profile, farm details, and account security.</p>
      </div>

      <section className="bg-surface border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 bg-primary-soft grid place-items-center"><Mail className="size-5 text-primary" /></div>
          <div>
            <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">SIGNED IN AS</p>
            <h3 className="font-extrabold tracking-tighter">{data.email}</h3>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {data.roles.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 bg-primary-soft text-primary px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm">
                <Shield className="size-3" /> {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 bg-primary-soft grid place-items-center"><User className="size-5 text-primary" /></div>
          <div>
            <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">PROFILE</p>
            <h3 className="font-extrabold tracking-tighter text-xl">Personal & Farm Details</h3>
          </div>
        </div>
        <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} className="input" placeholder="Jane Doe" />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} className="input" placeholder="+254…" />
          </Field>
          <Field label="Farm Name" className="md:col-span-2">
            <input value={farmName} onChange={(e) => setFarmName(e.target.value)} maxLength={120} className="input" placeholder="Sunrise Poultry Farm" />
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <button disabled={savingProfile} className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-sm disabled:opacity-50">
              {savingProfile ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-surface border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 bg-primary-soft grid place-items-center"><KeyRound className="size-5 text-primary" /></div>
          <div>
            <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">SECURITY</p>
            <h3 className="font-extrabold tracking-tighter text-xl">Change Password</h3>
          </div>
        </div>
        <form onSubmit={changePassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="New Password">
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} maxLength={128} className="input" placeholder="At least 8 characters" />
          </Field>
          <Field label="Confirm Password">
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} minLength={8} maxLength={128} className="input" placeholder="Repeat password" />
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <button disabled={savingPw} className="px-5 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest rounded-sm disabled:opacity-50">
              {savingPw ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </section>

      <style>{`.input{width:100%;background:hsl(var(--background));border:1px solid hsl(var(--border));padding:0.625rem 0.75rem;font-size:0.875rem;font-family:inherit;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block font-mono text-[10px] text-foreground/50 uppercase tracking-widest mb-2">{label}</span>
      {children}
    </label>
  );
}
