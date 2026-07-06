import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — PoultryGuard" }, { name: "description", content: "Sign in to PoultryGuard to monitor your poultry farm." }] }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/onboarding" });
    });
  }, [navigate]);

  // Login
  const [li, setLi] = useState({ email: "", password: "" });
  // Signup
  const [su, setSu] = useState({ full_name: "", email: "", phone: "", farm_name: "", password: "", confirm: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: li.email, password: li.password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/onboarding" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (su.password !== su.confirm) return toast.error("Passwords do not match");
    if (su.password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: su.email,
      password: su.password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { full_name: su.full_name, phone: su.phone, farm_name: su.farm_name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email or sign in");
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
      return;
    }
    if (!result.redirected) navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex flex-col justify-between bg-foreground text-background p-12">
        <a href="/" className="font-extrabold tracking-tighter text-xl uppercase">PoultryGuard</a>
        <div>
          <p className="font-mono text-[10px] text-primary-soft mb-6 tracking-widest">CLINICAL DECISION SUPPORT</p>
          <h1 className="font-serif italic text-5xl leading-tight mb-6">"Detect disease before it spreads through your flock."</h1>
          <p className="text-sm text-background/60">Trusted by farmers and veterinarians for early Avian Influenza and Newcastle Disease detection.</p>
        </div>
        <p className="font-mono text-[10px] text-background/40 tracking-widest">© 2026 POULTRYGUARD AI</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-3">SECURE ACCESS</p>
          <h2 className="text-3xl font-extrabold tracking-tighter mb-8">Welcome</h2>

          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" type="email" required value={li.email} onChange={(e) => setLi({ ...li, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="li-pw">Password</Label>
                  <Input id="li-pw" type="password" required value={li.password} onChange={(e) => setLi({ ...li, password: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-sm">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Full Name</Label>
                  <Input id="su-name" required value={su.full_name} onChange={(e) => setSu({ ...su, full_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="su-phone">Phone</Label>
                    <Input id="su-phone" value={su.phone} onChange={(e) => setSu({ ...su, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="su-farm">Farm Name</Label>
                    <Input id="su-farm" value={su.farm_name} onChange={(e) => setSu({ ...su, farm_name: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" required minLength={6} value={su.password} onChange={(e) => setSu({ ...su, password: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="su-c">Confirm Password</Label>
                  <Input id="su-c" type="password" required minLength={6} value={su.confirm} onChange={(e) => setSu({ ...su, confirm: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-sm">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-foreground/40">
            <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
          </div>
          <Button type="button" variant="outline" onClick={handleGoogle} disabled={loading} className="w-full rounded-sm">
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
