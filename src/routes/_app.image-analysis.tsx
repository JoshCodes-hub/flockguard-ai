import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { analyzeImage } from "@/lib/predictions.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload as UploadIcon, X } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_app/image-analysis")({
  head: () => ({ meta: [{ title: "Image Analysis — PoultryGuard AI" }] }),
  validateSearch: z.object({ farm: z.string().optional() }),
  component: ImageAnalysis,
});

function ImageAnalysis() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const analyze = useServerFn(analyzeImage);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: farms } = useQuery({
    queryKey: ["farms-list"],
    queryFn: async () => (await supabase.from("farms").select("id, farm_name")).data ?? [],
  });

  const [farmId, setFarmId] = useState(search.farm ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onFile(f: File | null) {
    if (!f) { setFile(null); setPreview(null); return; }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type)) {
      return toast.error("Only JPG, PNG, WEBP supported");
    }
    if (f.size > 8 * 1024 * 1024) return toast.error("Max 8MB");
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function onAnalyze() {
    if (!farmId) return toast.error("Select a farm");
    if (!file || !preview) return toast.error("Choose an image");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("bird-images").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const res = await analyze({ data: { farm_id: farmId, image_path: path, image_data_url: preview } });
      toast.success("Analysis complete");
      navigate({ to: "/predictions/$id", params: { id: res.prediction_id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">VISION AI MODULE</p>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-8">Image Analysis</h1>

      <div className="space-y-6 bg-surface border border-border p-6 md:p-8">
        <div>
          <Label className="text-xs font-bold uppercase tracking-widest">Farm</Label>
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a farm" /></SelectTrigger>
            <SelectContent>
              {(farms ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.farm_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border-4 border-dashed border-border p-8 text-center bg-background">
          {preview ? (
            <div className="relative inline-block">
              <img src={preview} alt="Preview" className="max-h-80 mx-auto" />
              <button onClick={() => onFile(null)} className="absolute -top-2 -right-2 size-8 bg-foreground text-background rounded-full grid place-items-center"><X className="size-4" /></button>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center size-16 bg-primary-soft rounded-full mb-6">
                <UploadIcon className="size-6 text-primary" />
              </div>
              <h3 className="text-xl font-extrabold tracking-tighter mb-2">Diagnostic Dropzone</h3>
              <p className="text-foreground/50 text-sm mb-6">Upload a bird image for instant AI analysis</p>
              <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              <Button onClick={() => inputRef.current?.click()} className="rounded-sm text-xs font-bold uppercase tracking-widest">Choose Image</Button>
              <p className="mt-6 font-mono text-[10px] text-foreground/30 uppercase tracking-[0.3em]">Supported: JPG · PNG · WEBP · Max 8MB</p>
            </>
          )}
        </div>

        <Button onClick={onAnalyze} disabled={loading || !file} className="w-full md:w-auto rounded-sm text-xs font-bold uppercase tracking-widest px-8 py-3 h-auto">
          {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Analyzing</> : "Analyze Image"}
        </Button>
      </div>
    </div>
  );
}
