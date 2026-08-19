// Shared display helpers. The API uses -1 for unlimited, sends prices as
// strings and storage in MB.

export const formatLimit = (value) =>
  value === -1 ? "Unlimited" : Number(value).toLocaleString("en-US");

export const formatPrice = (value) => Number(value).toLocaleString("en-IN");

export const formatStorage = (value) => {
  if (value === -1) return "Unlimited";
  return value >= 1024 ? `${(value / 1024).toFixed(0)} GB` : `${value} MB`;
};

// emailSupport comes back as a string ("Community"), but the subscription doc
// describes a boolean, so handle both.
export const formatSupport = (value) =>
  typeof value === "boolean" ? (value ? "Included" : "Not included") : value;

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
    `${formatLimit(plan.getRequestsLimit)} GET requests`,
    `${formatLimit(plan.writeRequestsLimit)} write requests`,
    `${plan.analytics} analytics`,
    `${formatSupport(plan.emailSupport)} support`,
    plan.customDomain && "Custom domain included",
    plan.mediaUpload && "Media upload included",
  ].filter(Boolean);

// Best yearly discount across the plans, for the "Save x%" badge.
export const yearlySavings = (plans) =>
  plans.reduce((best, plan) => {
    const monthlyTotal = Number(plan.monthlyPrice) * 12;
    const yearly = Number(plan.yearlyPrice);
    if (!monthlyTotal || yearly >= monthlyTotal) return best;
    return Math.max(best, Math.round(((monthlyTotal - yearly) / monthlyTotal) * 100));
  }, 0);

export const LIMIT_ROWS = [
  { key: "projectLimit", label: "Projects" },
  { key: "collectionLimit", label: "Collections" },
  { key: "apiKeyLimit", label: "API Keys" },
  { key: "teamMemberLimit", label: "Team Members" },
  { key: "getRequestsLimit", label: "GET Requests" },
  { key: "writeRequestsLimit", label: "WRITE Requests" },
];
