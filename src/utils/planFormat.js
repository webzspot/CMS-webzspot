// Shared display helpers. The API uses -1 for unlimited, sends prices as
// strings and storage in MB.

// A missing field reads as "-" rather than NaN: the API decides which fields a
// plan carries, so nothing here assumes one is present.
const missing = (value) => value === null || value === undefined || value === "";

export const formatLimit = (value) => {
  if (missing(value)) return "-";
  return Number(value) === -1 ? "Unlimited" : Number(value).toLocaleString("en-US");
};

export const formatPrice = (value) =>
  Number(missing(value) ? 0 : value).toLocaleString("en-IN");

export const formatStorage = (value) => {
  if (missing(value)) return "-";
  if (Number(value) === -1) return "Unlimited";
  return value >= 1024 ? `${(value / 1024).toFixed(0)} GB` : `${value} MB`;
};

// emailSupport comes back as a string ("Community"), but the subscription doc
// describes a boolean, so handle both.
export const formatSupport = (value) =>
  typeof value === "boolean"
    ? value
      ? "Included"
      : "Not included"
    : value || "-";

// The Super Admin's ranking. Null when the plan has no level yet.
export const planLevel = (plan) =>
  plan?.planLevel === null || plan?.planLevel === undefined
    ? null
    : Number(plan.planLevel);

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const countLabel = (value, singular, plural = `${singular}s`) => {
  if (value === -1) return `Unlimited ${plural}`;
  return `${formatLimit(value)} ${Number(value) === 1 ? singular : plural}`;
};

// One-line summary under the plan name.
export const planSummary = (plan) =>
  [
    countLabel(plan.projectLimit, "project"),
    countLabel(plan.teamMemberLimit, "team member"),
    `${formatStorage(plan.storageLimit)} storage`,
  ].join(" · ");

// Feature bullets, built from the plan data rather than hardcoded copy.
export const planFeatures = (plan) =>
  [
    countLabel(plan.projectLimit, "project"),
    countLabel(plan.collectionLimit, "collection"),
    countLabel(plan.apiKeyLimit, "API key"),
    countLabel(plan.teamMemberLimit, "team member"),
    `${formatStorage(plan.storageLimit)} storage`,
    // Request allowances refill every month; the other limits are fixed caps.
    `${formatLimit(plan.getRequestsLimit)} GET requests / month`,
    `${formatLimit(plan.writeRequestsLimit)} write requests / month`,
    `${plan.analytics} analytics`,
    `${formatSupport(plan.emailSupport)} support`,
    plan.customDomain && "Custom domain included",
    plan.mediaUpload && "Media upload included",
  ].filter(Boolean);

// A plan carries one price and its own billingCycle: NONE for free plans,
// MONTHLY or YEARLY for paid ones. Monthly and yearly are separate plans.
export const planPrice = (plan) => Number(plan?.price ?? 0);

export const isFreePlan = (plan) =>
  plan?.type === "FREE" || plan?.billingCycle === "NONE";

// "Monthly" / "Yearly" for naming a plan, e.g. "Pro Monthly".
export const cycleTitle = (billingCycle) =>
  billingCycle === "YEARLY"
    ? "Yearly"
    : billingCycle === "MONTHLY"
      ? "Monthly"
      : "";

export const cycleLabel = (billingCycle) =>
  billingCycle === "YEARLY" ? "year" : billingCycle === "MONTHLY" ? "month" : "";

// Plans that share a name are the same tier billed differently, so group them
// into one entry the UI can switch between. The API already sorts by
// displayOrder, and a Map keeps that order.
export const groupTiers = (plans = []) => {
  const byName = new Map();
  plans.forEach((plan) => {
    if (!byName.has(plan.name)) byName.set(plan.name, { name: plan.name, plans: [] });
    byName.get(plan.name).plans.push(plan);
  });
  // Free first, then monthly, then yearly, so the cards read cheapest-first.
  const rank = { NONE: 0, MONTHLY: 1, YEARLY: 2 };
  return [...byName.values()].map((tier) => ({
    ...tier,
    plans: [...tier.plans].sort(
      (a, b) => (rank[a.billingCycle] ?? 3) - (rank[b.billingCycle] ?? 3),
    ),
  }));
};

// What a tier costs per month, so a yearly lump sum cannot make a lower tier
// look like an upgrade. Falls back to a twelfth of the yearly price.
export const tierPrice = (plans = []) => {
  const monthly = plans.find((plan) => plan.billingCycle === "MONTHLY");
  if (monthly) return planPrice(monthly);
  const yearly = plans.find((plan) => plan.billingCycle === "YEARLY");
  return yearly ? planPrice(yearly) / 12 : 0;
};

// What a year on the yearly plan saves against twelve monthly payments.
const yearlyGap = (plans = []) => {
  const yearly = plans.find((plan) => plan.billingCycle === "YEARLY");
  const monthly = plans.find((plan) => plan.billingCycle === "MONTHLY");
  const monthlyTotal = planPrice(monthly) * 12;
  const yearlyPrice = planPrice(yearly);
  if (!monthlyTotal || !yearlyPrice || yearlyPrice >= monthlyTotal) return null;
  return { monthlyTotal, yearlyPrice };
};

export const yearlySavings = (plans = []) => {
  const gap = yearlyGap(plans);
  if (!gap) return 0;
  return Math.round(
    ((gap.monthlyTotal - gap.yearlyPrice) / gap.monthlyTotal) * 100,
  );
};

export const yearlySavingsAmount = (plans = []) => {
  const gap = yearlyGap(plans);
  return gap ? gap.monthlyTotal - gap.yearlyPrice : 0;
};

export const LIMIT_ROWS = [
  { key: "projectLimit", label: "Projects" },
  { key: "collectionLimit", label: "Collections" },
  { key: "apiKeyLimit", label: "API Keys" },
  { key: "teamMemberLimit", label: "Team Members" },
  { key: "getRequestsLimit", label: "GET Requests", perMonth: true },
  { key: "writeRequestsLimit", label: "WRITE Requests", perMonth: true },
];

// Usage limits reset on the billing date every month, whatever the plan's
// billing cycle is. The API has no field for this — it is a product rule.
export const RESET_CYCLE = "monthly";
