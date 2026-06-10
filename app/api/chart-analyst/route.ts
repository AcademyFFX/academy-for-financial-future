import { NextResponse } from "next/server";
import { analyzeChartSubmission } from "@/lib/chart-analyst";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { fileName, fileType, fileSize, storagePath, publicUrl, platform, studentNotes, drMoricetteReviewMode } = await request.json();
    const safeFileName = String(fileName ?? "").trim();
    const safePlatform = String(platform ?? "TradingView").trim();

    if (!safeFileName || !storagePath) {
      return NextResponse.json({ error: "Upload a chart screenshot or PDF before requesting analysis." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const analysis = analyzeChartSubmission({
      fileName: safeFileName,
      platform: safePlatform,
      studentNotes,
      drMoricetteReviewMode
    });

    const { data, error } = await supabase.from("chart_analyst_reports").insert({
      student_id: user.id,
      file_name: safeFileName,
      file_type: String(fileType ?? ""),
      file_size: Number(fileSize) || 0,
      storage_path: String(storagePath),
      public_url: publicUrl ? String(publicUrl) : null,
      platform: safePlatform,
      dr_moricette_review_mode: Boolean(drMoricetteReviewMode),
      student_notes: String(studentNotes ?? "").trim() || null,
      summary: analysis.summary,
      overall_grade: analysis.overallGrade,
      risk_rating: analysis.riskRating,
      sections: analysis.sections
    }).select("*").single();

    if (error) throw error;

    await supabase.from("chart_analyst_usage_events").insert({
      student_id: user.id,
      platform: safePlatform,
      file_type: String(fileType ?? ""),
      review_mode: Boolean(drMoricetteReviewMode),
      report_id: data.id
    });

    return NextResponse.json({ report: data, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze chart submission.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
