"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";
import type { CoachRecommendation } from "@/lib/ai-coach";

type ChatMessage = {
  id: string;
  role: "student" | "assistant";
  content: string;
  topic?: string | null;
  recommendations?: CoachRecommendation[] | null;
  created_at: string;
};

const promptChips = [
  "What is market structure?",
  "What is a liquidity sweep?",
  "Explain NFP.",
  "How do institutional orders move price?",
  "How should I manage risk before news?"
];

export default function AIForexCoachPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("Loading AI Forex Coach history...");

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  useEffect(() => {
    async function loadHistory() {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("ai_coach_chat_messages")
          .select("*")
          .eq("student_id", user.id)
          .order("created_at", { ascending: true })
          .limit(80);

        if (error) throw error;
        setMessages((data ?? []) as ChatMessage[]);
        setStatus("AI Forex Coach ready.");
      } catch (error) {
        setStatus(getErrorMessage(error, "Run the AI Coach migration to enable chat history."));
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [router]);

  async function askCoach(event?: React.FormEvent<HTMLFormElement>, override?: string) {
    event?.preventDefault();
    const prompt = (override ?? question).trim();
    if (!prompt) return;

    setSending(true);
    setStatus("AI Forex Coach is reviewing the AFF curriculum...");
    setQuestion("");

    const studentMessage: ChatMessage = {
      id: `student-${Date.now()}`,
      role: "student",
      content: prompt,
      created_at: new Date().toISOString()
    };
    setMessages((current) => [...current, studentMessage]);

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to answer question.");

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: payload.answer,
        topic: payload.topic,
        recommendations: payload.recommendations,
        created_at: new Date().toISOString()
      };
      setMessages((current) => [...current, assistantMessage]);
      setStatus("AI Forex Coach response saved to chat history.");
    } catch (error) {
      setStatus(getErrorMessage(error, "Unable to answer question."));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AI Forex Coach"
        title="Ask the AFF curriculum assistant."
        text="Get educational guidance on Forex Anatomy, market structure, institutional orders, order flow, economic data, liquidity, sessions, broker execution, risk, psychology, and certification preparation."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <div className="flex items-center gap-3">
                <Bot className="text-gold-300" size={24} />
                <div>
                  <h2 className="text-xl font-semibold text-white">Coach Chat</h2>
                  <p className="mt-1 text-sm text-ink/64">{status}</p>
                </div>
              </div>
            </div>

            <div className="grid max-h-[620px] min-h-[420px] gap-4 overflow-y-auto p-5">
              {loading ? <p className="text-ink/70">Loading chat history...</p> : null}
              {!loading && messages.length === 0 ? (
                <div className="border border-gold-500/20 bg-navy-950 p-5">
                  <p className="text-lg font-semibold text-white">Start with a curriculum question.</p>
                  <p className="mt-2 leading-7 text-ink/70">Try: What is market structure? What is a liquidity sweep? Explain NFP.</p>
                </div>
              ) : null}
              {messages.map((message) => (
                <article key={message.id} className={`border p-4 ${message.role === "assistant" ? "border-gold-500/24 bg-navy-950" : "border-gold-500/14 bg-navy-900"}`}>
                  <div className="flex items-center gap-2">
                    {message.role === "assistant" ? <Bot className="text-gold-300" size={17} /> : <User className="text-gold-300" size={17} />}
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{message.role === "assistant" ? message.topic ?? "AI Forex Coach" : "Student"}</p>
                  </div>
                  <p className="mt-3 whitespace-pre-line leading-7 text-ink/78">{message.content}</p>
                  {message.recommendations?.length ? (
                    <div className="mt-4 grid gap-2">
                      <p className="text-xs uppercase tracking-[.18em] text-gold-300">Recommended Lessons</p>
                      {message.recommendations.map((recommendation) => (
                        <Link key={`${message.id}-${recommendation.href}`} className="border border-gold-500/16 bg-navy-900 px-3 py-2 text-sm text-ink/74 hover:border-gold-400/60" href={recommendation.href}>
                          <span className="font-semibold text-white">{recommendation.lessonTitle}</span>
                          <span className="block text-xs text-ink/54">{recommendation.courseTitle}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <form onSubmit={(event) => askCoach(event)} className="grid gap-3 border-t border-gold-500/20 p-5 sm:grid-cols-[1fr_auto]">
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                placeholder="Ask about market structure, liquidity, NFP, risk, psychology..."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={sending}
              />
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={sending}>
                <Send size={18} /> Ask Coach
              </button>
            </form>
          </section>

          <aside className="grid h-fit gap-6">
            <section className="terminal-panel p-5">
              <div className="flex items-center gap-3">
                <Sparkles className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Prompt Starters</h2>
              </div>
              <div className="mt-4 grid gap-2">
                {promptChips.map((prompt) => (
                  <button key={prompt} className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-left text-sm text-ink/76 hover:border-gold-400/60" type="button" onClick={() => askCoach(undefined, prompt)} disabled={sending}>
                    {prompt}
                  </button>
                ))}
              </div>
            </section>

            <section className="terminal-panel p-5">
              <h2 className="text-xl font-semibold text-white">Coach Scope</h2>
              <p className="mt-3 leading-7 text-ink/70">
                Educational assistant for Academy curriculum only. It explains concepts, recommends lessons, and supports certification study. It does not provide personal financial advice or trade signals.
              </p>
            </section>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}
