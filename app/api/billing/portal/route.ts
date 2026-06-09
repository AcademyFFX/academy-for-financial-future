import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { stripeRequest } from "@/lib/stripe-rest";

type PortalSessionResponse = {
  url: string;
};

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("student_memberships")
      .select("stripe_customer_id")
      .eq("student_id", user.id)
      .single();

    if (error) throw error;
    const customerId = data?.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer is connected to this student account yet." }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.append("customer", customerId);
    params.append("return_url", `${origin}/billing`);

    const portal = await stripeRequest<PortalSessionResponse>("/billing_portal/sessions", params);
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open billing portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
