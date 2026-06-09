import { NextResponse } from "next/server";
import { answerForexCoachQuestion } from "@/lib/ai-coach";
import { courseCatalog } from "@/lib/course-catalog";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
    : `You have ${count} tracked completed lesson${count === 1 ? "" : "s"}. Review certification materials and practice explaining the concepts in your own words.`;
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    const prompt = String(question ?? "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "Ask the AI Forex Coach a question." }, { status: 400 });
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
    const coachAnswer = answerForexCoachQuestion(prompt, progressContext, extraKnowledge);

    await supabase.from("ai_coach_chat_messages").insert([
      {
        student_id: user.id,
        role: "student",
        content: prompt
      },
      {
        student_id: user.id,
        role: "assistant",
        content: coachAnswer.answer,
        topic: coachAnswer.topic,
        recommendations: coachAnswer.recommendations
      }
    ]);

    return NextResponse.json(coachAnswer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to answer AI Coach question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
