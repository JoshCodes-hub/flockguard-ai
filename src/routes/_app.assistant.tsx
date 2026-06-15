import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, useEffect } from "react";
import { askAssistant } from "@/lib/assistant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Bot, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_app/assistant")({
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What are the early signs of Avian Influenza?",
  "Vaccination schedule for Newcastle Disease",
  "How to improve biosecurity on a small farm?",
  "My birds have ruffled feathers and low appetite — what should I do?",
];

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setErr(null);
    try {
      const { reply } = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen max-w-4xl mx-auto">
      <header className="px-6 md:px-10 pt-8 pb-4 border-b border-border">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50 mb-2">/ AI Assistant</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">Farm Assistant</h1>
        <p className="text-sm text-foreground/60 mt-1">Veterinary guidance powered by Gemini. Not a substitute for a licensed vet.</p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto px-6 md:px-10 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-foreground/60">
              <Sparkles className="size-5 text-primary" />
              <p className="text-sm">Ask anything about poultry health, disease, or farm management.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left p-4 border border-border rounded-sm hover:border-primary hover:bg-accent/30 transition-colors text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="size-8 shrink-0 rounded-sm bg-primary/10 text-primary grid place-items-center">
                <Bot className="size-4" />
              </div>
            )}
            <div className={`max-w-[80%] p-4 rounded-sm text-sm whitespace-pre-wrap leading-relaxed ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
            }`}>
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="size-8 shrink-0 rounded-sm bg-foreground/10 grid place-items-center">
                <UserIcon className="size-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="size-8 shrink-0 rounded-sm bg-primary/10 text-primary grid place-items-center">
              <Bot className="size-4" />
            </div>
            <div className="bg-card border border-border p-4 rounded-sm text-sm text-foreground/50 font-mono text-xs tracking-widest">
              THINKING…
            </div>
          </div>
        )}

        {err && <div className="p-3 border border-destructive/40 bg-destructive/5 text-destructive text-sm rounded-sm">{err}</div>}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="border-t border-border p-4 md:p-6 flex gap-2 bg-background"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about poultry health…"
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
