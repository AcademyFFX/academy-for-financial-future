import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    status: "ready",
    message: "Certificate generation endpoint prepared. Connect this route to completed enrollments and certificate PDF storage in Supabase."
  });
}
