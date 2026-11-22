// AFF secure examination submission endpoint: deliberately disabled scaffold.
// No database access, grading, or token persistence is implemented here.
// Enable only after approved staging schema, transactional RPC, authentication,
// server-only answer keys, and security tests are complete.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { error: 'Secure examination submission is not enabled.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
