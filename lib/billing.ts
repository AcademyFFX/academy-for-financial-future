export type BillingPlan = {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  cadence: string;
  mode: "trial" | "subscription" | "payment";
  priceEnv?: string;
  membershipStatus: string;
  accountStatus: "Trial" | "Active";
  features: string[];
  highlighted?: boolean;
};

export const billingPlans: BillingPlan[] = [
  {
    id: "free-trial",
    name: "Free Trial",
    description: "Start with limited academy access before choosing a paid membership.",
    priceLabel: "$0",
    cadence: "7 days",
    mode: "trial",
    membershipStatus: "Free Trial",
    accountStatus: "Trial",
    features: ["Student dashboard", "Course preview access", "Live class schedule", "Upgrade anytime"]
  },
  {
    id: "monthly-membership",
    name: "Monthly Membership",
    description: "Full monthly access to academy courses, live classes, and student tools.",
    priceLabel: "Monthly",
    cadence: "recurring",
    mode: "subscription",
    priceEnv: "STRIPE_MONTHLY_MEMBERSHIP_PRICE_ID",
    membershipStatus: "Monthly Membership",
    accountStatus: "Active",
    highlighted: true,
    features: ["Full course access", "Trading journal", "Assignments", "Live trading room", "Zoom classes"]
  },
  {
    id: "annual-membership",
    name: "Annual Membership",
    description: "One year of AFF training access with simplified annual billing.",
    priceLabel: "Annual",
    cadence: "recurring",
    mode: "subscription",
    priceEnv: "STRIPE_ANNUAL_MEMBERSHIP_PRICE_ID",
    membershipStatus: "Annual Membership",
    accountStatus: "Active",
    features: ["Annual academy access", "All monthly benefits", "Priority live class seats", "Certificate readiness tracking"]
  },
  {
    id: "premium-mentorship",
    name: "Premium Mentorship",
    description: "Advanced mentorship tier for guided forex development and instructor review.",
    priceLabel: "Premium",
    cadence: "recurring",
    mode: "subscription",
    priceEnv: "STRIPE_PREMIUM_MENTORSHIP_PRICE_ID",
    membershipStatus: "Premium Mentorship",
    accountStatus: "Active",
    features: ["Mentorship access", "Advanced trade review", "Premium live sessions", "Priority instructor feedback"]
  },
  {
    id: "certification-fee",
    name: "Certification Fee",
    description: "One-time certification processing fee for eligible AFF students.",
    priceLabel: "One-time",
    cadence: "payment",
    mode: "payment",
    priceEnv: "STRIPE_CERTIFICATION_FEE_PRICE_ID",
    membershipStatus: "Certification Fee",
    accountStatus: "Active",
    features: ["Certification processing", "Verified certificate record", "Employer verification support"]
  }
];

export const restrictedEnrollmentRoutes = ["/assignments", "/homework-center", "/live-classroom", "/exams", "/certificates", "/journal", "/live-trading-room"];

export function getBillingPlan(planId: string) {
  return billingPlans.find((plan) => plan.id === planId);
}

export function hasAcademyAccess(membership?: {
  account_status?: string | null;
  payment_status?: string | null;
  membership_status?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
}) {
  if (!membership) return false;
  if (membership.account_status === "Active" && membership.membership_status === "Active" && membership.payment_status === "Paid") return true;

  if (membership.account_status === "Trial" && membership.trial_ends_at) {
    return new Date(membership.trial_ends_at).getTime() > Date.now();
  }

  return false;
}
