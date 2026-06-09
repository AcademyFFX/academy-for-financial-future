import { NextResponse } from "next/server";
import { getMarketplaceProduct } from "@/lib/marketplace";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { appendMetadata, stripeRequest } from "@/lib/stripe-rest";

type CheckoutSessionResponse = {
  id: string;
  url: string;
  customer?: string;
};

export async function POST(request: Request) {
  try {
    const { productId, couponCode, affiliateCode } = await request.json();
    const product = getMarketplaceProduct(String(productId ?? ""));

    if (!product) {
      return NextResponse.json({ error: "Invalid marketplace product." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const priceId = process.env[product.priceEnv];
    if (!priceId) {
      return NextResponse.json({ error: `Missing ${product.priceEnv}.` }, { status: 500 });
    }

    const origin = new URL(request.url).origin;
    const adminSupabase = createSupabaseAdminClient();
    const purchasePayload = {
      student_id: user.id,
      student_email: user.email ?? "",
      product_id: product.id,
      product_title: product.title,
      product_category: product.category,
      product_type: product.productType,
      instructor_name: product.instructorName,
      amount: product.priceCents / 100,
      currency: "USD",
      purchase_status: "Checkout Started",
      access_url: product.accessUrl,
      affiliate_code: typeof affiliateCode === "string" && affiliateCode.trim() ? affiliateCode.trim().toUpperCase() : null,
      coupon_code: typeof couponCode === "string" && couponCode.trim() ? couponCode.trim().toUpperCase() : null,
      updated_at: new Date().toISOString()
    };

    const { data: purchase, error: purchaseError } = await adminSupabase
      .from("marketplace_purchases")
      .insert(purchasePayload)
      .select("id")
      .single();

    if (purchaseError) throw purchaseError;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${origin}/marketplace?checkout=success&product=${product.id}`);
    params.append("cancel_url", `${origin}/marketplace?checkout=cancelled`);
    params.append("allow_promotion_codes", "true");
    params.append("customer_email", user.email ?? "");
    params.append("client_reference_id", user.id);
    appendMetadata(params, {
      student_id: user.id,
      student_email: user.email ?? "",
      purchase_id: String(purchase.id),
      marketplace_product_id: product.id,
      product_title: product.title,
      product_category: product.category,
      product_type: product.productType,
      access_url: product.accessUrl,
      affiliate_code: purchasePayload.affiliate_code ?? "",
      coupon_code: purchasePayload.coupon_code ?? ""
    });

    if (purchasePayload.coupon_code) {
      const { data: coupon } = await supabase
        .from("marketplace_coupons")
        .select("stripe_promotion_code_id")
        .eq("code", purchasePayload.coupon_code)
        .eq("active", true)
        .maybeSingle();

      if (coupon?.stripe_promotion_code_id) {
        params.delete("allow_promotion_codes");
        params.append("discounts[0][promotion_code]", coupon.stripe_promotion_code_id);
      }
    }

    const session = await stripeRequest<CheckoutSessionResponse>("/checkout/sessions", params);

    const { error: updateError } = await adminSupabase
      .from("marketplace_purchases")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", purchase.id);

    if (updateError) throw updateError;

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start marketplace checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
