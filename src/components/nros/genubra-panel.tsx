"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGenubraPanel } from "./genubra-panel-context";

type Message = { role: "operator" | "genubra"; content: string };

export function GenubraPanel() {
  const { open, setOpen } = useGenubraPanel();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "operator", content: text }, { role: "genubra", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/agents/genubra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "genubra", content: next[next.length - 1].content + chunk };
          return next;
        });
      }
    } catch (e: any) {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "genubra", content: `// transmission failed: ${e?.message ?? "unknown"}` };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="genubra"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="fixed right-0 top-0 z-30 h-screen w-full sm:w-[380px] border-l border-border/60 bg-background/85 backdrop-blur-xl flex flex-col"
        >
          <div className="h-16 px-4 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <p className="font-mono text-xs tracking-[0.24em] uppercase">GENUBRA</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="p-4 space-y-4 text-sm">
              {messages.length === 0 && (
                <div className="nros-deck p-4 space-y-2">
                  <p className="nros-eyebrow">// strategic intelligence</p>
                  <p className="text-muted-foreground">
                    Ask GENUBRA for goal analysis, mission generation, monetization, or progression strategy.
                    Direct answers. No filler.
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "operator" ? "text-right" : ""}>
                  <p className="nros-eyebrow mb-1">{m.role === "operator" ? "// you" : "// genubra"}</p>
                  <div
                    className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-md px-3 py-2 ${
                      m.role === "operator"
                        ? "bg-primary/10 border border-primary/30 text-foreground"
                        : "bg-secondary/40 border border-border/60 text-foreground"
                    }`}
                  >
                    {m.content || (streaming ? "▋" : "")}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border/60 space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Operator query…"
              className="min-h-[68px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">⌘ + ⏎ to transmit</span>
              <Button size="sm" onClick={send} disabled={streaming || !input.trim()}>
                <Send className="h-3 w-3" /> Transmit
              </Button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
