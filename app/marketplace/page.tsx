"use client";

import { useRouter } from "next/navigation";
import {
  BadgePercent,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Crown,
  Download,
  FileText,
  GraduationCap,
  History,
  Package,
  Receipt,
  ShoppingBag,
  Sparkles,
  Star,
  TicketPercent,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { marketplaceProducts, type MarketplaceProduct } from "@/lib/marketplace";
import { createClient } from "@/lib/supabase";

type Purchase = {
  id: string;
  product_id: string;
  product_title: string;
  product_category: string;
  amount: number | null;
  currency: string | null;
  purchase_status: string | null;
  access_url: string | null;
  created_at: string;
};

type DbProduct = {
  product_id: string;
  title: string;
  category: string;
  product_type: MarketplaceProduct["productType"];
  description: string;
  price_label: string;
  price_cents: number;
  price_env: string;
  instructor_name: string;
  access_url: string;
  featured: boolean;
  active: boolean;
};

const categories = ["All", "Courses", "Certifications", "Mentorship", "Trading Journals", "Case Studies", "Workshops", "Digital Downloads", "Bundles"];

const iconByType = {
  course: BookOpen,
  certification: GraduationCap,
  mentorship: Crown,
  journal: ClipboardList,
  "case-study": FileText,
  workshop: BriefcaseBusiness,
  download: Download,
  bundle: Package
};

function formatCurrency(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format((cents ?? 0) / 100);
}

function normalizeProduct(row: DbProduct): MarketplaceProduct {
  return {
    id: row.product_id,
    title: row.title,
    category: row.category,
    productType: row.product_type,
    description: row.description,
    priceLabel: row.price_label,
    priceCents: row.price_cents,
    priceEnv: row.price_env,
    instructorName: row.instructor_name,
    accessUrl: row.access_url,
    featured: row.featured
  };
}

export default function MarketplacePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<MarketplaceProduct[]>(marketplaceProducts);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [couponCode, setCouponCode] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [processingProduct, setProcessingProduct] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading AFF Marketplace...");

  const filteredProducts = useMemo(() => {
    return activeCategory === "All" ? products : products.filter((product) => product.category === activeCategory);
  }, [activeCategory, products]);

  const featuredProducts = useMemo(() => products.filter((product) => product.featured).slice(0, 3), [products]);
  const purchaseTotal = useMemo(() => purchases.reduce((total, purchase) => total + (purchase.amount ?? 0), 0), [purchases]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  useEffect(() => {
    async function loadMarketplace() {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser }
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);

        const [productsResult, purchasesResult] = await Promise.all([
          supabase.from("marketplace_products").select("*").eq("active", true).order("featured", { ascending: false }).order("created_at", { ascending: false }),
          supabase.from("marketplace_purchases").select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false }).limit(50)
        ]);

        if (!productsResult.error && productsResult.data?.length) {
          setProducts((productsResult.data as DbProduct[]).map(normalizeProduct));
        }

        if (purchasesResult.error) throw purchasesResult.error;

        setPurchases((purchasesResult.data ?? []) as Purchase[]);
        setMessage("Marketplace ready. Browse academy products, bundles, downloads, and mentorship programs.");
      } catch (error) {
        setMessage(getErrorMessage(error, "Run the marketplace migration to enable products and purchase history."));
      } finally {
        setLoading(false);
      }
    }

    loadMarketplace();
  }, [router]);

  async function startCheckout(productId: string) {
    setProcessingProduct(productId);
    setMessage("Preparing secure marketplace checkout...");

    try {
      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          couponCode: couponCode.trim() || null,
          affiliateCode: affiliateCode.trim() || null
        })
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "Unable to start marketplace checkout.");
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to start marketplace checkout."));
    } finally {
      setProcessingProduct("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Marketplace"
        title="Digital storefront for academy products, credentials, and professional learning tools."
        text="Purchase courses, certifications, mentorship programs, trading journals, case studies, live workshops, digital downloads, and bundled learning pathways through secure checkout."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <p className="text-sm text-ink/72">{message}</p>

          <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <aside className="terminal-panel h-fit p-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-gold-300" size={24} />
                <h2 className="text-xl font-semibold text-white">Marketplace Account</h2>
              </div>
              <div className="mt-5 grid gap-4">
                <AccountLine label="Student" value={user?.email ?? "Student"} />
                <AccountLine label="Purchase History" value={`${purchases.length} item${purchases.length === 1 ? "" : "s"}`} />
                <AccountLine label="Total Purchases" value={formatCurrency(purchaseTotal * 100)} />
              </div>

              <div className="mt-6 grid gap-3">
                <label className="grid gap-2 text-sm text-ink/70">
                  Coupon Code
                  <div className="flex items-center gap-2 border border-gold-500/24 bg-navy-950 px-3">
                    <TicketPercent className="shrink-0 text-gold-300" size={17} />
                    <input className="w-full bg-transparent py-3 uppercase text-white outline-none" placeholder="AFF coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} />
                  </div>
                </label>
                <label className="grid gap-2 text-sm text-ink/70">
                  Affiliate Code
                  <div className="flex items-center gap-2 border border-gold-500/24 bg-navy-950 px-3">
                    <BadgePercent className="shrink-0 text-gold-300" size={17} />
                    <input className="w-full bg-transparent py-3 uppercase text-white outline-none" placeholder="Partner code" value={affiliateCode} onChange={(event) => setAffiliateCode(event.target.value.toUpperCase())} />
                  </div>
                </label>
              </div>
            </aside>

            <section className="grid gap-4 md:grid-cols-3">
              {featuredProducts.map((product) => (
                <article key={product.id} className="terminal-panel p-5 shadow-gold">
                  <Star className="text-gold-300" size={22} />
                  <p className="mt-4 text-xs uppercase tracking-[.2em] text-gold-300">Featured</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{product.title}</h3>
                  <p className="mt-2 text-2xl font-semibold text-gold-300">{product.priceLabel}</p>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{product.description}</p>
                </article>
              ))}
            </section>
          </section>

          <section className="terminal-panel p-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 text-sm font-semibold ${activeCategory === category ? "bg-gold-500 text-navy-950" : "border border-gold-500/24 text-gold-300"}`}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const Icon = iconByType[product.productType];
              return (
                <article key={product.id} className="terminal-panel flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="text-gold-300" size={24} />
                    <span className="border border-gold-500/24 px-3 py-1 text-xs uppercase tracking-[.16em] text-gold-300">{product.category}</span>
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold text-white">{product.title}</h2>
                  <p className="mt-2 text-2xl font-semibold text-gold-300">{product.priceLabel}</p>
                  <p className="mt-3 min-h-28 leading-7 text-ink/70">{product.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-ink/64">
                    <UserRound className="text-gold-300" size={16} />
                    <span>{product.instructorName}</span>
                  </div>
                  <button
                    className="mt-6 inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-60"
                    type="button"
                    disabled={processingProduct === product.id}
                    onClick={() => startCheckout(product.id)}
                  >
                    <Sparkles size={16} /> {processingProduct === product.id ? "Preparing..." : "Purchase"}
                  </button>
                </article>
              );
            })}
          </section>

          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <div className="flex items-center gap-3">
                <History className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Purchase History and Digital Access</h2>
              </div>
            </div>
            {loading ? (
              <p className="p-5 text-ink/68">Loading purchase history...</p>
            ) : purchases.length === 0 ? (
              <p className="p-5 text-ink/68">No marketplace purchases recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-navy-800">
                      {["Date", "Product", "Category", "Amount", "Status", "Access"].map((header) => (
                        <th key={header} className="p-4 text-left font-semibold text-gold-300">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="bg-navy-950">
                        <td className="p-4 text-ink/76">{new Date(purchase.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-white">{purchase.product_title}</td>
                        <td className="p-4 text-ink/76">{purchase.product_category}</td>
                        <td className="p-4 text-ink/76">{formatCurrency(Math.round(Number(purchase.amount ?? 0) * 100), purchase.currency ?? "USD")}</td>
                        <td className="p-4 text-ink/76">
                          <span className="inline-flex items-center gap-2">
                            <CheckCircle2 className="text-gold-300" size={16} />
                            {purchase.purchase_status ?? "Recorded"}
                          </span>
                        </td>
                        <td className="p-4">
                          <a className="inline-flex items-center gap-2 text-gold-300" href={purchase.access_url ?? "/marketplace"}>
                            <Receipt size={16} /> Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function AccountLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}
