export const MEMBERSHIP_PLANS = ["Free Trial", "Monthly Membership", "Annual Membership", "Premium Mentorship", "Certification Fee"] as const;

export type MembershipPlan = (typeof MEMBERSHIP_PLANS)[number];
export type PaymentStatus = "Not Required" | "Pending" | "Paid";
export type MembershipStatus = "Free Trial" | "Pending Payment" | "Active Membership" | "Suspended" | "Cancelled";
export type AccountStatus = "Trial" | "Restricted" | "Active" | "Suspended" | "Cancelled";

export type MembershipState = {
  selectedPlan: MembershipPlan;
  currentPlan: MembershipPlan;
  paymentStatus: PaymentStatus;
  membershipStatus: MembershipStatus;
  accountStatus: AccountStatus;
};

export type MembershipRowLike = {
  selected_membership_plan?: string | null;
  active_membership_plan?: string | null;
  membership_plan?: string | null;
  payment_status?: string | null;
  membership_status?: string | null;
  account_status?: string | null;
};

const paidPlans = new Set<MembershipPlan>(["Monthly Membership", "Annual Membership", "Premium Mentorship", "Certification Fee"]);

export function normalizeMembershipPlan(value?: string | null): MembershipPlan {
  const trimmed = value?.trim();
  return MEMBERSHIP_PLANS.includes(trimmed as MembershipPlan) ? (trimmed as MembershipPlan) : "Free Trial";
}

export function isPaidMembershipPlan(plan: string | null | undefined) {
  return paidPlans.has(normalizeMembershipPlan(plan));
}

export function buildFreeTrialState(): MembershipState {
  return {
    selectedPlan: "Free Trial",
    currentPlan: "Free Trial",
    paymentStatus: "Not Required",
    membershipStatus: "Free Trial",
    accountStatus: "Trial"
  };
}

export function buildPendingPaymentState(selectedPlan: string | null | undefined): MembershipState {
  const normalizedSelectedPlan = normalizeMembershipPlan(selectedPlan);
  if (normalizedSelectedPlan === "Free Trial") return buildFreeTrialState();

  return {
    selectedPlan: normalizedSelectedPlan,
    currentPlan: "Free Trial",
    paymentStatus: "Pending",
    membershipStatus: "Pending Payment",
    accountStatus: "Restricted"
  };
}

export function buildActiveMembershipState(plan: string | null | undefined): MembershipState {
  const normalizedPlan = normalizeMembershipPlan(plan);
  if (normalizedPlan === "Free Trial") return buildFreeTrialState();

  return {
    selectedPlan: normalizedPlan,
    currentPlan: normalizedPlan,
    paymentStatus: "Paid",
    membershipStatus: "Active Membership",
    accountStatus: "Active"
  };
}

export function normalizeMembershipState(row?: MembershipRowLike | null): MembershipState {
  const selectedPlan = normalizeMembershipPlan(row?.selected_membership_plan ?? row?.membership_plan ?? row?.active_membership_plan);
  const currentPlan = normalizeMembershipPlan(row?.active_membership_plan ?? row?.membership_plan);
  const paymentStatus = row?.payment_status?.trim();
  const membershipStatus = row?.membership_status?.trim();
  const accountStatus = row?.account_status?.trim();

  if (membershipStatus === "Suspended" || accountStatus === "Suspended") {
    return {
      selectedPlan: selectedPlan !== "Free Trial" ? selectedPlan : currentPlan,
      currentPlan,
      paymentStatus: paymentStatus === "Paid" ? "Paid" : "Pending",
      membershipStatus: "Suspended",
      accountStatus: "Suspended"
    };
  }

  if (membershipStatus === "Cancelled" || accountStatus === "Cancelled") {
    return {
      selectedPlan: "Free Trial",
      currentPlan: "Free Trial",
      paymentStatus: "Not Required",
      membershipStatus: "Cancelled",
      accountStatus: "Cancelled"
    };
  }

  if (currentPlan !== "Free Trial") {
    return buildActiveMembershipState(currentPlan);
  }

  if (selectedPlan === "Free Trial" || paymentStatus === "Not Required") {
    return buildFreeTrialState();
  }

  if (paymentStatus === "Paid" || membershipStatus === "Active Membership" || membershipStatus === "Active" || accountStatus === "Active") {
    return buildActiveMembershipState(selectedPlan);
  }

  return buildPendingPaymentState(selectedPlan);
}

export function membershipStateToDbPayload(state: MembershipState) {
  return {
    selected_membership_plan: state.selectedPlan,
    active_membership_plan: state.currentPlan,
    membership_plan: state.currentPlan,
    payment_status: state.paymentStatus,
    membership_status: state.membershipStatus,
    account_status: state.accountStatus
  };
}

export function hasFullCourseAccess(row?: MembershipRowLike | null) {
  const state = normalizeMembershipState(row);
  return state.paymentStatus === "Paid" && state.membershipStatus === "Active Membership" && state.accountStatus === "Active" && state.currentPlan !== "Free Trial";
}

export function hasPreviewAccess(row?: MembershipRowLike | null) {
  const state = normalizeMembershipState(row);
  return state.currentPlan === "Free Trial" && state.paymentStatus === "Not Required" && state.membershipStatus === "Free Trial";
}
