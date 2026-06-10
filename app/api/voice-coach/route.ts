import { NextResponse } from "next/server";
import { courseCatalog } from "@/lib/course-catalog";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { answerVoiceCoachQuestion, voiceCoachModes, type VoiceCoachMode } from "@/lib/voice-coach";

type ProgressRow = {
  course_id?: string | number | null;
  lesson_id?: string | number | null;
  completed_at?: string | null;
};

type KnowledgeRow = {
  title?: string | null;
  content?: string | null;
};

function buildProgressContext(progressRows: ProgressRow[]) {
  if (!progressRows.length) {
    return "You have not completed any tracked lessons yet. Start with Forex Anatomy: The Skeleton: Market Structure.";
  }

  const completed = new Set(progressRows.map((row) => String(row.lesson_id)));
  const forexAnatomy = courseCatalog.find((course) => course.id === "forex-anatomy");
  const nextLesson = forexAnatomy?.lessons.find((lesson) => !completed.has(lesson.id) && !completed.has(String(lesson.dbId)));
  const count = completed.size;

  return nextLesson
    ? `You have ${count} tracked completed lesson${count === 1 ? "" : "s"}. Your next recommended Forex Anatomy lesson is ${nextLesson.title}.`
    : `You have ${count} tracked completed lesson${count === 1 ? "" : "s"}. Continue reviewing certification materials and leadership practice.`;
}

function isVoiceCoachMode(value: string): value is VoiceCoachMode {
  return voiceCoachModes.some((item) => item.mode === value);
}

export async function POST(request: Request) {
  try {
    const { transcript, mode, durationSeconds, source } = await request.json();
    const prompt = String(transcript ?? "").trim();
    const selectedMode = isVoiceCoachMode(String(mode ?? "")) ? mode as VoiceCoachMode : "Forex Instructor Mode";

    if (!prompt) {
      return NextResponse.json({ error: "Speak or type a question for the AFF AI Voice Coach." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const [progressResult, knowledgeResult] = await Promise.all([
      supabase.from("lesson_progress").select("course_id, lesson_id, completed_at").eq("student_id", user.id),
      supabase.from("ai_coach_knowledge").select("title, content").eq("active", true).order("created_at", { ascending: false }).limit(6)
    ]);

    const progressContext = progressResult.error ? "" : buildProgressContext((progressResult.data ?? []) as ProgressRow[]);
    const extraKnowledge = knowledgeResult.error
      ? []
      : ((knowledgeResult.data ?? []) as KnowledgeRow[]).map((row) => `${row.title ?? "Instructor Upload"}: ${row.content ?? ""}`).filter(Boolean);
    const coachAnswer = answerVoiceCoachQuestion(prompt, selectedMode, progressContext, extraKnowledge);
    const responseText = coachAnswer.answer;

    await supabase.from("voice_coach_conversations").insert([
      {
        student_id: user.id,
        coach_mode: selectedMode,
        role: "student",
        transcript: prompt,
        audio_duration_seconds: Number(durationSeconds) || null,
        source: source === "typed" ? "typed" : "microphone"
      },
      {
        student_id: user.id,
        coach_mode: selectedMode,
        role: "assistant",
        transcript: responseText,
        topic: coachAnswer.topic,
        recommendations: coachAnswer.recommendations,
        source: "tts"
      }
    ]);

    await supabase.from("voice_coach_usage_events").insert({
      student_id: user.id,
      coach_mode: selectedMode,
      event_type: "voice_exchange",
      prompt_characters: prompt.length,
      response_characters: responseText.length,
      audio_duration_seconds: Number(durationSeconds) || 0
    });

    return NextResponse.json(coachAnswer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to answer AFF AI Voice Coach prompt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
