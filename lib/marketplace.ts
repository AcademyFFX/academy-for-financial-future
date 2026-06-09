export type MarketplaceProduct = {
  id: string;
  title: string;
  category: string;
  productType: "course" | "certification" | "mentorship" | "journal" | "case-study" | "workshop" | "download" | "bundle";
  description: string;
  priceLabel: string;
  priceCents: number;
  priceEnv: string;
  instructorName: string;
  accessUrl: string;
  featured?: boolean;
};

export const marketplaceProducts: MarketplaceProduct[] = [
  {
    id: "forex-foundations-course",
    title: "Forex Foundations Course",
    category: "Courses",
    productType: "course",
    description: "Core academy course covering currency pairs, sessions, pips, spreads, orders, brokers, and market mechanics.",
    priceLabel: "$297",
    priceCents: 29700,
    priceEnv: "STRIPE_MARKETPLACE_FOREX_FOUNDATIONS_PRICE_ID",
    instructorName: "Dr. Jean Rene Moricette",
    accessUrl: "/courses",
    featured: true
  },
  {
    id: "forex-anatomy-certification",
    title: "Forex Anatomy Certification",
    category: "Certifications",
    productType: "certification",
    description: "Certification pathway for market structure, liquidity, institutional orders, order flow, central banks, and broker execution.",
    priceLabel: "$497",
    priceCents: 49700,
    priceEnv: "STRIPE_MARKETPLACE_FOREX_ANATOMY_CERTIFICATION_PRICE_ID",
    instructorName: "Dr. Jean Rene Moricette",
    accessUrl: "/exams",
    featured: true
  },
  {
    id: "premium-mentorship-intensive",
    title: "Premium Mentorship Intensive",
    category: "Mentorship",
    productType: "mentorship",
    description: "Instructor-guided mentorship with assignment review, journal feedback, certification planning, and market discipline coaching.",
    priceLabel: "$1,997",
    priceCents: 199700,
    priceEnv: "STRIPE_MARKETPLACE_PREMIUM_MENTORSHIP_PRICE_ID",
    instructorName: "Dr. Jean Rene Moricette",
    accessUrl: "/messages"
  },
  {
    id: "professional-trading-journal",
    title: "Professional Trading Journal Template",
    category: "Trading Journals",
    productType: "journal",
    description: "Digital journal system for trade plans, risk percentage, execution notes, screenshots, and post-trade review discipline.",
    priceLabel: "$47",
    priceCents: 4700,
    priceEnv: "STRIPE_MARKETPLACE_TRADING_JOURNAL_PRICE_ID",
    instructorName: "Academy for Financial Future",
    accessUrl: "/journal"
  },
  {
    id: "institutional-case-study-pack",
    title: "Institutional Case Study Pack",
    category: "Case Studies",
    productType: "case-study",
    description: "Downloadable case studies on liquidity sweeps, order blocks, market structure shifts, and central bank volatility.",
    priceLabel: "$97",
    priceCents: 9700,
    priceEnv: "STRIPE_MARKETPLACE_CASE_STUDY_PACK_PRICE_ID",
    instructorName: "Academy for Financial Future",
    accessUrl: "/marketplace"
  },
  {
    id: "live-market-workshop",
    title: "Live Market Workshop",
    category: "Workshops",
    productType: "workshop",
    description: "Interactive workshop seat for London/New York session preparation, trade planning, and risk management review.",
    priceLabel: "$197",
    priceCents: 19700,
    priceEnv: "STRIPE_MARKETPLACE_LIVE_WORKSHOP_PRICE_ID",
    instructorName: "Dr. Jean Rene Moricette",
    accessUrl: "/live-trading-room"
  },
  {
    id: "aff-download-library",
    title: "AFF Digital Download Library",
    category: "Digital Downloads",
    productType: "download",
    description: "Digital pack of worksheets, risk templates, certification prep sheets, lesson notes, and academy checklists.",
    priceLabel: "$67",
    priceCents: 6700,
    priceEnv: "STRIPE_MARKETPLACE_DOWNLOAD_LIBRARY_PRICE_ID",
    instructorName: "Academy for Financial Future",
    accessUrl: "/courses"
  },
  {
    id: "certification-bundle",
    title: "Certification Success Bundle",
    category: "Bundles",
    productType: "bundle",
    description: "Bundled course, exam prep, trading journal, case studies, and certification fee support for serious students.",
    priceLabel: "$797",
    priceCents: 79700,
    priceEnv: "STRIPE_MARKETPLACE_CERTIFICATION_BUNDLE_PRICE_ID",
    instructorName: "Dr. Jean Rene Moricette",
    accessUrl: "/certificates",
    featured: true
  }
];

export function getMarketplaceProduct(productId: string) {
  return marketplaceProducts.find((product) => product.id === productId);
}
