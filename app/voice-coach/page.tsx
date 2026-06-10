"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Mic, MicOff, Play, RefreshCw, Send, Sparkles, Square, User, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";
import { voiceCoachModes, type VoiceCoachMode } from "@/lib/voice-coach";
import type { CoachRecommendation } from "@/lib/ai-coach";

type VoiceMessage = {
  id: string;
  coach_mode: VoiceCoachMode;
  role: "student" | "assistant";
  transcript: string;
  topic?: string | null;
  recommendations?: CoachRecommendation[] | null;
  audio_duration_seconds?: number | null;
  source?: string | null;
  created_at: string;
};

type SpeechRecognitionResult = {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
};

type SpeechRecognitionEvent = {
  readonly results: ArrayLike<SpeechRecognitionResult>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const promptStarters = [
  "Explain market structure in one minute.",
  "Coach me through a liquidity sweep.",
  "How should I prepare for NFP?",
  "Give me a civic leadership reflection prompt.",
  "How do I present my certification to an employer?"
];

export default function VoiceCoachPage() {
  const router = useRouter();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [mode, setMode] = useState<VoiceCoachMode>("Forex Instructor Mode");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [micSupported, setMicSupported] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [status, setStatus] = useState("Loading AFF AI Voice Coach history...");
  const [lastDuration, setLastDuration] = useState(0);

  const usage = useMemo(() => {
    const exchanges = messages.filter((message) => message.role === "student").length;
    const assistantResponses = messages.filter((message) => message.role === "assistant").length;
    const seconds = messages.reduce((total, message) => total + Number(message.audio_duration_seconds ?? 0), 0);
    return { exchanges, assistantResponses, seconds };
  }, [messages]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadHistory = useCallback(async () => {
    setLoading(true);
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
        .from("voice_coach_conversations")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: true })
        .limit(120);

      if (error) throw error;
      setMessages((data ?? []) as VoiceMessage[]);
      setStatus("AFF AI Voice Coach ready.");
    } catch (error) {
      setStatus(getErrorMessage(error, "Run the Voice Coach migration to enable conversation history."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setMicSupported(typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
    setSpeechSupported(typeof window !== "undefined" && ("speechSynthesis" in window));
    loadHistory();

    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [loadHistory]);

  async function startRecording() {
    if (!micSupported) {
      setStatus("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      recorder.start();
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStartedAtRef.current = null;
      };

      const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          let finalText = "";
          let interimText = "";
          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            if (result.isFinal) finalText += result[0].transcript;
            else interimText += result[0].transcript;
          }
          if (finalText.trim()) {
            setTranscript((current) => `${current} ${finalText}`.trim());
          }
          setInterimTranscript(interimText);
        };
        recognition.onend = () => setInterimTranscript("");
        recognitionRef.current = recognition;
        recognition.start();
      }

      setRecording(true);
      setStatus(Recognition ? "Recording and transcribing..." : "Recording audio. Type the transcript before sending if browser transcription is unavailable.");
    } catch (error) {
      setStatus(getErrorMessage(error, "Unable to start microphone recording."));
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    const duration = recordingStartedAtRef.current ? Math.round((Date.now() - recordingStartedAtRef.current) / 1000) : 0;
    setLastDuration(duration);
    setRecording(false);
    setInterimTranscript("");
    setStatus("Recording stopped. Review the transcript, then send it to the Voice Coach.");
  }

  function speak(text: string) {
    if (!speechSupported) {
      setStatus("Text-to-speech is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function sendPrompt(event?: React.FormEvent<HTMLFormElement>, override?: string) {
    event?.preventDefault();
    const prompt = (override ?? transcript).trim();
    if (!prompt) {
      setStatus("Speak or type a question before sending.");
      return;
    }

    setSending(true);
    setStatus("AFF AI Voice Coach is preparing a spoken response...");
    setTranscript("");
    setInterimTranscript("");

    const studentMessage: VoiceMessage = {
      id: `student-${Date.now()}`,
      coach_mode: mode,
      role: "student",
      transcript: prompt,
      audio_duration_seconds: lastDuration,
      source: override ? "typed" : "microphone",
      created_at: new Date().toISOString()
    };
    setMessages((current) => [...current, studentMessage]);

    try {
      const response = await fetch("/api/voice-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: prompt,
          mode,
          durationSeconds: lastDuration,
          source: override ? "typed" : "microphone"
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to answer Voice Coach prompt.");

      const assistantMessage: VoiceMessage = {
        id: `assistant-${Date.now()}`,
        coach_mode: mode,
        role: "assistant",
        transcript: payload.answer,
        topic: payload.topic,
        recommendations: payload.recommendations,
        source: "tts",
        created_at: new Date().toISOString()
      };
      setMessages((current) => [...current, assistantMessage]);
      setStatus("Voice response generated and saved.");
      speak(payload.answer);
    } catch (error) {
      setStatus(getErrorMessage(error, "Unable to answer Voice Coach prompt."));
    } finally {
      setSending(false);
      setLastDuration(0);
    }
  }

  const activeMode = voiceCoachModes.find((item) => item.mode === mode) ?? voiceCoachModes[1];

  return (
    <>
      <PageHeader
        eyebrow="AFF AI Voice Coach"
        title="Speak with the Academy coaching system."
        text="Practice Forex Anatomy, institutional trading logic, civic leadership, career readiness, and certification preparation with microphone recording, spoken responses, saved history, and usage analytics."
      />

      <Section>
        <SectionInner className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <Bot className="mt-1 text-gold-300" size={26} />
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Voice Conversation</h2>
                    <p className="mt-2 text-sm leading-6 text-ink/64">{status}</p>
                  </div>
                </div>
                <Link className="inline-flex items-center justify-center gap-2 border border-gold-500/40 px-4 py-2 text-sm font-semibold text-gold-300" href="/ai-coach">
                  <Sparkles size={16} /> Open AI Coach
                </Link>
              </div>
            </div>

            <div className="grid max-h-[620px] min-h-[430px] gap-4 overflow-y-auto p-5">
              {loading ? <p className="text-ink/70">Loading voice history...</p> : null}
              {!loading && messages.length === 0 ? (
                <div className="border border-gold-500/20 bg-navy-950 p-5">
                  <p className="text-lg font-semibold text-white">Start a voice coaching session.</p>
                  <p className="mt-2 leading-7 text-ink/70">Choose a coach mode, record or type a prompt, then play the spoken response.</p>
                </div>
              ) : null}
              {messages.map((message) => (
                <article key={message.id} className={`border p-4 ${message.role === "assistant" ? "border-gold-500/24 bg-navy-950" : "border-gold-500/14 bg-navy-900"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {message.role === "assistant" ? <Bot className="text-gold-300" size={17} /> : <User className="text-gold-300" size={17} />}
                      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{message.role === "assistant" ? message.topic ?? message.coach_mode : "Student"}</p>
                    </div>
                    {message.role === "assistant" ? (
                      <button className="inline-flex items-center gap-2 border border-gold-500/30 px-3 py-1 text-xs font-semibold text-gold-300" type="button" onClick={() => speak(message.transcript)}>
                        <Volume2 size={14} /> Play
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-line leading-7 text-ink/78">{message.transcript}</p>
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

            <form className="grid gap-4 border-t border-gold-500/20 p-5" onSubmit={(event) => sendPrompt(event)}>
              <textarea
                className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                placeholder="Record with the microphone or type your question..."
                value={`${transcript}${interimTranscript ? ` ${interimTranscript}` : ""}`}
                onChange={(event) => {
                  setTranscript(event.target.value);
                  setInterimTranscript("");
                }}
                disabled={sending}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                {!recording ? (
                  <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 font-bold text-gold-300 disabled:opacity-60" type="button" onClick={startRecording} disabled={!micSupported || sending}>
                    <Mic size={18} /> Record
                  </button>
                ) : (
                  <button className="inline-flex items-center justify-center gap-2 border border-red-400/50 px-4 py-3 font-bold text-red-200" type="button" onClick={stopRecording}>
                    <Square size={18} /> Stop
                  </button>
                )}
                <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 font-bold text-gold-300" type="button" onClick={() => window.speechSynthesis?.cancel()}>
                  <MicOff size={18} /> Mute
                </button>
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={sending}>
                  <Send size={18} /> Send
                </button>
              </div>
            </form>
          </section>

          <aside className="grid h-fit gap-6">
            <section className="terminal-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">Coach Modes</h2>
                <button className="text-gold-300" type="button" onClick={loadHistory} aria-label="Refresh voice coach history">
                  <RefreshCw size={18} />
                </button>
              </div>
              <div className="mt-4 grid gap-2">
                {voiceCoachModes.map((item) => (
                  <button key={item.mode} className={`border px-4 py-3 text-left ${mode === item.mode ? "border-gold-400 bg-gold-500 text-navy-950" : "border-gold-500/24 bg-navy-950 text-ink/76"}`} type="button" onClick={() => setMode(item.mode)}>
                    <span className="block font-semibold">{item.label}</span>
                    <span className={`mt-1 block text-xs leading-5 ${mode === item.mode ? "text-navy-900" : "text-ink/54"}`}>{item.description}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-ink/68">{activeMode.focus}</p>
            </section>

            <section className="terminal-panel p-5">
              <h2 className="text-xl font-semibold text-white">Prompt Starters</h2>
              <div className="mt-4 grid gap-2">
                {promptStarters.map((prompt) => (
                  <button key={prompt} className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-left text-sm text-ink/76 hover:border-gold-400/60" type="button" onClick={() => sendPrompt(undefined, prompt)} disabled={sending}>
                    {prompt}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-px overflow-hidden border border-gold-500/20 bg-gold-500/14">
              <Metric label="Voice Exchanges" value={String(usage.exchanges)} />
              <Metric label="Spoken Responses" value={String(usage.assistantResponses)} />
              <Metric label="Recorded Seconds" value={String(usage.seconds)} />
              <Metric label="OpenAI Voice Ready" value="Architecture" />
            </section>

            <section className="terminal-panel p-5">
              <div className="flex items-center gap-3">
                <Play className="text-gold-300" size={20} />
                <h2 className="text-xl font-semibold text-white">Voice Architecture</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                The current build uses browser microphone capture, Web Speech transcription when available, and browser text-to-speech. The protected `/api/voice-coach` route is prepared to route prompts through OpenAI voice services when credentials are added.
              </p>
            </section>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
