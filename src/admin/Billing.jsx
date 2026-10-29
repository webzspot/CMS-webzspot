import { useEffect, useState } from "react";
import {
  FiCheck,
  FiMinus,
  FiAlertCircle,
  FiRefreshCw,
  FiArrowUp,
  FiLoader,
  FiX,
  FiStar,
  FiCheckCircle,
  FiCalendar,
} from "react-icons/fi";
import PageShell from "../components/PageShell";
import BillingHistory from "./BillingHistory";
import {
  getCurrentSubscription,
  getAvailablePlans,
  upgradeSubscription,
} from "../api/subscriptionApi";
import { loadRazorpay } from "../utils/razorpay";
import { getErrorMessage } from "../api/axios";
import { useAuth } from "../auth/authContext";
import {
  formatLimit,
  formatPrice,
  formatStorage,
  formatSupport,
  formatDate,
  planLevel,
  planSummary,
  planFeatures,
  planPrice,
  isFreePlan,
  cycleLabel,
  cycleTitle,
  groupTiers,
  tierPrice,
  yearlySavings,
  yearlySavingsAmount,
  LIMIT_ROWS,
  RESET_CYCLE,
} from "../utils/planFormat";

const StatusBadge = ({ status }) => {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
};

const CurrentSubscription = ({ subscription, error }) => {
  if (error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <FiAlertCircle className="mx-auto mb-3 text-slate-300" size={28} />
        <h3 className="font-medium text-slate-800">No active subscription</h3>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  const { plan, billingCycle, status, startDate, endDate } = subscription;
  // The cycle lives on the plan; the subscription only echoes it.
  const cycle = billingCycle || plan?.billingCycle;
  const price = planPrice(plan);
  const label = cycleLabel(cycle);

  const rows = [
    { label: "Current Plan", value: plan?.name },
    { label: "Billing", value: cycle === "NONE" ? "Not billed" : cycle },
    {
      label: "Price",
      value: price
        ? `₹${formatPrice(price)}${label ? ` / ${label}` : ""}`
        : "Free",
    },
    { label: "Start Date", value: formatDate(startDate) },
    { label: "End Date", value: formatDate(endDate) },
  ];

  // Everything the plan actually grants, read straight off the API response.
  // Feeds the "What this plan includes" grid below, which is commented out.
  // eslint-disable-next-line no-unused-vars
  const limitRows = [
    ...LIMIT_ROWS.map((row) => ({
      label: row.perMonth ? `${row.label} / month` : row.label,
      value: formatLimit(plan?.[row.key]),
    })),
    { label: "Storage", value: formatStorage(plan?.storageLimit) },
    {
      label: "Custom Domain",
      value: plan?.customDomain ? "Included" : "Not included",
    },
    {
      label: "Media Upload",
      value: plan?.mediaUpload ? "Included" : "Not included",
    },
    { label: "Analytics", value: plan?.analytics || "-" },
    { label: "Email Support", value: formatSupport(plan?.emailSupport) },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          Current Subscription
        </h2>
        <StatusBadge status={status} />
      </div>
      <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">
              {row.value || "-"}
            </dd>
          </div>
        ))}
      </dl>

      {/* <p className="mt-6 mb-3 text-xs font-medium tracking-wider text-slate-400 uppercase">
        What this plan includes
      </p>
      <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {limitRows.map((row) => (
          <div key={row.label} className="rounded-lg bg-slate-50 p-4">
            <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">
              {row.value}
            </dd>
          </div>
        ))}
      </dl> */}

      {status === "PENDING" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          This subscription is waiting on payment confirmation. It becomes
          active once the payment is confirmed.
        </p>
      )}

      {status && status !== "ACTIVE" && status !== "PENDING" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          This subscription is no longer active. You are on the Free plan until
          you choose a new one.
        </p>
      )}
    </div>
  );
};

const PlanAction = ({ state, busy, onUpgrade }) => {
  const base =
    "mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition";

  if (state === "current") {
    return (
      <div className={`${base} cursor-default bg-slate-100 text-slate-500`}>
        Current Plan
      </div>
    );
  }

  // Nothing sits above this plan, so there is no upgrade to offer.
  if (state === "max") {
    return (
      <div
        title="No higher plan is available"
        className={`${base} cursor-default bg-slate-100 text-slate-500`}
      >
        <FiCheckCircle size={15} /> Maximum Plan
      </div>
    );
  }

  if (state === "upgrade") {
    return (
      <button
        onClick={onUpgrade}
        disabled={busy}
        className={`${base} border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-60`}
      >
        {busy ? <FiLoader className="animate-spin" /> : <FiArrowUp size={15} />}
        Switch to this Plan
      </button>
    );
  }

  // Cheaper plans are filtered out of the list: a downgrade needs Super Admin
  // approval, so it is never offered as a button here.

  // No active subscription, so there is nothing to upgrade from
  return (
    <div className={`${base} cursor-default bg-slate-50 text-slate-400`}>
      No active subscription
    </div>
  );
};

// The switch picks a plan, not a billing cycle: each tier then shows its own
// monthly and yearly cards side by side.
const TierToggle = ({ tiers, activeName, onChange }) => (
  <div className="inline-flex rounded-full bg-slate-100 p-1">
    {tiers.map((tier) => (
      <button
        key={tier.name}
        onClick={() => onChange(tier.name)}
        className={`flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-medium transition ${
          activeName === tier.name
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        {tier.name}
        {tier.isCurrent && (
          <span
            title="Your current plan"
            className={`h-1.5 w-1.5 rounded-full ${
              activeName === tier.name ? "bg-white" : "bg-emerald-500"
            }`}
          />
        )}
      </button>
    ))}
  </div>
);

const PlanCard = ({
  plan,
  state,
  busy,
  onUpgrade,
  previousName,
  savings,
  savingsAmount,
}) => {
  const price = planPrice(plan);
  const free = isFreePlan(plan);
  const highlight = plan.isPopular;
  const yearly = plan.billingCycle === "YEARLY";

  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 transition ${
        highlight
          ? "border-indigo-200 bg-indigo-50/50 shadow-sm"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* Both cards in a tier share the name, so the cycle leads here */}
          <h3 className="text-xl font-semibold text-slate-900">
            {free ? "Free" : yearly ? "Yearly" : "Monthly"}
          </h3>
          {highlight && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 shadow-sm">
              <FiStar size={11} /> Popular
            </span>
          )}
        </div>
        {yearly && savings > 0 && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
            Save {savings}%
          </span>
        )}
      </div>

      <p className="mt-2 min-h-[40px] text-sm text-slate-500">
        {planSummary(plan)}
      </p>

      <p className="mt-4 flex items-start gap-1">
        <span className="mt-1.5 text-lg font-medium text-slate-900">₹</span>
        <span className="text-4xl font-bold tracking-tight text-slate-900">
          {formatPrice(price)}
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {free
          ? "Free forever"
          : yearly
            ? "Per year · Billed annually"
            : "Per month"}
      </p>
      {yearly && savingsAmount > 0 && (
        <p className="mt-1 text-xs font-medium text-emerald-600">
          You save ₹{formatPrice(savingsAmount)} a year
        </p>
      )}

      <PlanAction state={state} busy={busy} onUpgrade={() => onUpgrade(plan)} />

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Features</p>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            <FiCalendar size={11} /> Resets {RESET_CYCLE}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {previousName
            ? `Everything in ${previousName}, plus`
            : "Everything you need to get started"}
        </p>
        <ul className="mt-4 space-y-2.5">
          {planFeatures(plan).map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-slate-600"
            >
              <FiCheckCircle
                className="mt-0.5 shrink-0 text-indigo-600"
                size={15}
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// A plan reads as "Pro Monthly" from the response, never from a lookup here.
const planTitle = (plan) =>
  [plan?.name, cycleTitle(plan?.billingCycle)].filter(Boolean).join(" ");

const UpgradeDialog = ({ data, busy, onClose, onPay }) => {
  const { currentPlan, newPlan, selectedPlan } = data;
  // The backend sends its figures under `calculation`; the older doc called
  // it `upgrade`. Both are read as-is — nothing here is worked out locally.
  const calc = data.calculation || data.upgrade || {};
  const payNow = calc.upgradeAmount ?? calc.amountToPay;
  // Worked out by the backend from the days left on the old plan.
  const credit = Number(calc.unusedCredit) || 0;
  // The response names the plans but not their cycle, so use the clicked one.
  const cycle = newPlan?.billingCycle || selectedPlan?.billingCycle;
  const perCycle = cycleLabel(cycle);

  const rows = [
    {
      label: "Current plan",
      detail: planTitle(currentPlan),
      value: `₹${formatPrice(currentPlan?.price)}`,
    },
    {
      label: "New plan",
      detail: [newPlan?.name, cycleTitle(cycle)].filter(Boolean).join(" "),
      value: `₹${formatPrice(newPlan?.price)}${perCycle ? ` / ${perCycle}` : ""}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Confirm upgrade</h3>
        <p className="mt-1 text-sm text-slate-500">
          {planTitle(currentPlan)} → {planTitle(newPlan)}
        </p>

        <dl className="mt-5 space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="min-w-0">
                <span className="text-slate-500">{row.label}</span>
                <span className="block truncate text-xs text-slate-400">
                  {row.detail}
                </span>
              </dt>
              <dd className="shrink-0 font-medium text-slate-800">
                {row.value}
              </dd>
            </div>
          ))}

          {credit > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">
                Unused credit
                <span className="block text-xs text-slate-400">
                  {calc.remainingDays != null
                    ? `${calc.remainingDays} of ${calc.totalDays} days left on your current plan`
                    : "From the days left on your current plan"}
                </span>
              </dt>
              <dd className="shrink-0 font-medium text-emerald-600">
                − ₹{formatPrice(credit)}
              </dd>
            </div>
          )}

          <div className="flex justify-between border-t border-slate-200 pt-3">
            <dt className="font-medium text-slate-700">Pay now</dt>
            <dd className="font-semibold text-slate-900">
              ₹{formatPrice(payNow)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-slate-400">
          This is a one-time upgrade payment worked out by the backend. From the
          next cycle onwards you pay the {newPlan?.name} price of ₹
          {formatPrice(newPlan?.price)}
          {perCycle ? ` / ${perCycle}` : ""}.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onPay}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <FiLoader className="animate-spin" />}
            Upgrade to {newPlan?.name}
          </button>
        </div>
      </div>
    </div>
  );
};

// "You are currently on the maximum plan." comes back as a 201, not an error.
// Both halves are checked: a 201 alone could mean something else later, and the
// message alone should not block a real upgrade.
const MAX_PLAN_MESSAGE = "You are currently on the maximum plan.";

const isMaxPlanReply = (data) =>
  data?.httpStatus === 201 &&
  String(data?.message || "")
    .toLowerCase()
    .includes("maximum plan");

const Yes = () => <FiCheck className="mx-auto text-emerald-600" size={16} />;
const No = () => <FiMinus className="mx-auto text-slate-300" size={16} />;

// Kept for the Plan Comparison block further down, which is commented out.
// eslint-disable-next-line no-unused-vars
const ComparisonTable = ({ plans }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table className="w-full min-w-[560px] text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="px-5 py-3 text-left font-medium text-slate-500">
            Feature
          </th>
          {plans.map((plan) => (
            <th
              key={plan.planId}
              className="px-5 py-3 text-center font-semibold text-slate-800"
            >
              {plan.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {LIMIT_ROWS.map((row) => (
          <tr key={row.key} className="border-b border-slate-50">
            <td className="px-5 py-3 text-slate-500">
              {row.label}
              {row.perMonth && (
                <span className="text-slate-400"> / month</span>
              )}
            </td>
            {plans.map((plan) => (
              <td
                key={plan.planId}
                className="px-5 py-3 text-center font-medium text-slate-800"
              >
                {formatLimit(plan[row.key])}
              </td>
            ))}
          </tr>
        ))}
        <tr className="border-b border-slate-50">
          <td className="px-5 py-3 text-slate-500">Storage</td>
          {plans.map((plan) => (
            <td
              key={plan.planId}
              className="px-5 py-3 text-center font-medium text-slate-800"
            >
              {formatStorage(plan.storageLimit)}
            </td>
          ))}
        </tr>
        <tr className="border-b border-slate-50">
          <td className="px-5 py-3 text-slate-500">Custom Domain</td>
          {plans.map((plan) => (
            <td key={plan.planId} className="px-5 py-3">
              {plan.customDomain ? <Yes /> : <No />}
            </td>
          ))}
        </tr>
        <tr className="border-b border-slate-50">
          <td className="px-5 py-3 text-slate-500">Media Upload</td>
          {plans.map((plan) => (
            <td key={plan.planId} className="px-5 py-3">
              {plan.mediaUpload ? <Yes /> : <No />}
            </td>
          ))}
        </tr>
        <tr className="border-b border-slate-50">
          <td className="px-5 py-3 text-slate-500">Analytics</td>
          {plans.map((plan) => (
            <td
              key={plan.planId}
              className="px-5 py-3 text-center font-medium text-slate-800"
            >
              {plan.analytics}
            </td>
          ))}
        </tr>
        <tr>
          <td className="px-5 py-3 text-slate-500">Email Support</td>
          {plans.map((plan) => (
            <td
              key={plan.planId}
              className="px-5 py-3 text-center font-medium text-slate-800"
            >
              {formatSupport(plan.emailSupport)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

const Billing = () => {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [subscription, setSubscription] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [plans, setPlans] = useState([]);
  const [plansError, setPlansError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tierName, setTierName] = useState("");
  const [maxPlanMessage, setMaxPlanMessage] = useState("");
  const [upgrade, setUpgrade] = useState(null);
  const [upgradingId, setUpgradingId] = useState(null);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState(null);

  // tenantId comes from the logged-in user
  const loadBilling = (id) =>
    Promise.all([
      id &&
        getCurrentSubscription(id)
          .then((data) => {
            setSubscription(data);
            setSubscriptionError("");
          })
          .catch((error) => {
            setSubscription(null);
            setSubscriptionError(getErrorMessage(error));
          }),
      getAvailablePlans()
        .then((data) => {
          setPlans(data);
          setPlansError("");
        })
        .catch((error) => setPlansError(getErrorMessage(error))),
    ]).finally(() => setLoading(false));

  const refresh = () => {
    setLoading(true);
    setMaxPlanMessage("");
    loadBilling(tenantId);
  };

  useEffect(() => {
    loadBilling(tenantId);
  }, [tenantId]);

  // Once a subscription ends the tenant falls back to the Free plan, so treat
  // Free as the active one again and every paid plan becomes available. A
  // PENDING one is mid-payment, not ended, so it keeps its plan.
  const expired =
    Boolean(subscription) &&
    subscription.status !== "ACTIVE" &&
    subscription.status !== "PENDING";
  const freePlan = plans.find(isFreePlan);
  const currentPlanId = expired
    ? freePlan?.planId
    : subscription?.plan?.planId;
  const currentPrice = expired ? 0 : planPrice(subscription?.plan);

  // planLevel is the Super Admin's ranking and wins when both plans carry one.
  // Two plans on the same level are the same tier billed differently, so only
  // the dearer of the pair is a step up. Price decides when levels are absent.
  const currentLevel = planLevel(expired ? freePlan : subscription?.plan);

  const rawState = (plan) => {
    if (plan.planId === currentPlanId) return "current";
    if (!subscription || !tenantId) return "none";

    const level = planLevel(plan);
    if (level !== null && currentLevel !== null && level !== currentLevel) {
      return level > currentLevel ? "upgrade" : "downgrade";
    }
    return planPrice(plan) > currentPrice ? "upgrade" : "downgrade";
  };

  // The backend has the final say: a 201 "maximum plan" reply overrides the
  // catalogue. Otherwise nothing left to move up to means the same thing.
  // On the maximum plan either because the backend said so on upgrade, or
  // because nothing in the catalogue sits above the current plan.
  const hasUpgradePath = plans.some((plan) => rawState(plan) === "upgrade");
  const atMaxPlan =
    Boolean(currentPlanId) && (Boolean(maxPlanMessage) || !hasUpgradePath);

  const planState = (plan) =>
    atMaxPlan && plan.planId === currentPlanId ? "max" : rawState(plan);

  // Monthly and yearly arrive as separate plans sharing a name, so group them
  // back into one tier per name and let the toggle pick the tier.
  const tiers = groupTiers(plans).map((tier) => ({
    ...tier,
    isCurrent: tier.plans.some((plan) => plan.planId === currentPlanId),
    savings: yearlySavings(tier.plans),
    savingsAmount: yearlySavingsAmount(tier.plans),
    cards: tier.plans.filter((plan) => planState(plan) !== "downgrade"),
  }));

  // Tiers below the active one are dropped: a downgrade needs Super Admin
  // approval, so Free disappears once a paid plan is running. On Free — or
  // after an expiry — every tier is back on the list.
  //
  // planLevel is the ranking the Super Admin sets. It is only trusted when
  // every plan carries one; otherwise the monthly-equivalent price stands in,
  // which also stops a yearly lump sum from looking like a tier jump.
  const useLevels = plans.length > 0 && plans.every((p) => p.planLevel != null);
  const rankOf = (tier) =>
    useLevels ? Number(tier.plans[0].planLevel) : tierPrice(tier.plans);

  // With no subscription at all there is nothing to rank against, so show
  // every tier rather than hiding the cheapest one.
  const currentTier = tiers.find((tier) => tier.isCurrent);
  const visibleTiers = tiers.filter(
    (tier) =>
      !currentTier ||
      tier.isCurrent ||
      (tier.cards.length > 0 && rankOf(tier) > rankOf(currentTier)),
  );

  // Falling back instead of storing the default avoids resetting state in an
  // effect once the plans arrive.
  const activeTier =
    visibleTiers.find((tier) => tier.name === tierName) ||
    visibleTiers.find((tier) => tier.isCurrent) ||
    visibleTiers[0];

  // "Everything in X, plus" refers to the tier below this one.
  const previousTierName =
    tiers[tiers.findIndex((tier) => tier.name === activeTier?.name) - 1]?.name;

  const startUpgrade = async (plan) => {
    setUpgradingId(plan.planId);
    setNotice(null);
    try {
      const data = await upgradeSubscription({
        tenantId,
        planId: plan.planId,
      });
  console.log(data)
      // Already on the top plan: no dialog, no Razorpay. The message on the
      // page carries the backend's own wording, so no toast on top of it.
      if (isMaxPlanReply(data)) {
        setMaxPlanMessage(data.message || MAX_PLAN_MESSAGE);
        return;
      }

      // The backend refused the upgrade — show its reason, open nothing.
      if (data?.success === false) {
        setNotice({ type: "error", text: data.message || "Upgrade failed" });
        return;
      }

      // A success without payment details cannot open Checkout, so show what
      // the backend said instead of a half-filled dialog. Either an orderId
      // (paid → paid) or a subscriptionId (free → paid) is enough.
      if (!data?.razorpay?.orderId && !data?.razorpay?.subscriptionId) {
        setNotice({
          type: "success",
          text: data?.message || "Upgrade could not be started.",
        });
        refresh();
        return;
      }

      // currentPlan/newPlan come back with just a name and price, so the plan
      // that was clicked supplies the billing cycle for the dialog.
      setUpgrade({ ...data, selectedPlan: plan });
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setUpgradingId(null);
    }
  };

  const openCheckout = async () => {
    setPaying(true);
    const ready = await loadRazorpay();
    if (!ready) {
      setPaying(false);
      setNotice({ type: "error", text: "Could not load Razorpay Checkout." });
      return;
    }

    const newPlan = upgrade.newPlan;

    // Two shapes come back from /upgrade. A paid → paid upgrade is a one-time
    // order for the pro-rated difference; free → paid starts a subscription for
    // the recurring AutoPay. The backend decides which by sending orderId or
    // subscriptionId — the amount is never assembled here.
    const payment = upgrade.razorpay.orderId
      ? { order_id: upgrade.razorpay.orderId }
      : { subscription_id: upgrade.razorpay.subscriptionId };

    const checkout = new window.Razorpay({
      key: upgrade.razorpay.keyId,
      ...payment,
      name: "CMSX",
      description: `Upgrade to ${newPlan?.name}`,
      theme: { color: "#000000" },
      handler: async () => {
        // Razorpay's callback is not proof of payment — the webhook tells the
        // backend. So re-read the subscription and report what it actually
        // says, rather than declaring the upgrade done from here.
        setUpgrade(null);
        setPaying(false);
        setMaxPlanMessage("");

        setNotice({
          type: "success",
          text: "Payment received. Your subscription is being confirmed.",
        });

        // Only re-read what the backend holds. Activating the new plan,
        // cancelling the old one and moving the dates are the webhook's job.
        try {
          const current = await getCurrentSubscription(tenantId);
          setSubscription(current);
          setSubscriptionError("");
        } catch {
          // Leave the existing subscription on screen; Refresh will retry.
        }
      },
      modal: {
        ondismiss: () => {
          setPaying(false);
          setNotice({ type: "error", text: "Payment cancelled." });
        },
      },
    });

    checkout.open();
  };

  return (
    <PageShell
      title="Billing & Subscription"
      subtitle="Your current plan and the plans available to you."
      actions={
        <button
          onClick={refresh}
          title="Refresh"
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
        >
          <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      }
    >
      {notice && (
        <div
          className={`mb-6 flex items-start justify-between gap-3 rounded-lg p-4 text-sm ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)}>
            <FiX size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : (
        <div className="space-y-10">
          <CurrentSubscription
            subscription={subscription}
            error={
              subscription
                ? ""
                : !tenantId
                  ? "No tenant linked to this account"
                  : subscriptionError || "Not available"
            }
          />

          <div>
            

            {visibleTiers.length > 0 && (
              <div className="mb-6 flex justify-center">
                <TierToggle
                  tiers={visibleTiers}
                  activeName={activeTier?.name}
                  onChange={setTierName}
                />
              </div>
            )}

            {plansError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                {plansError}
              </div>
            )  : !activeTier ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                {/* The backend's own wording when it says there is nothing above */}
                {atMaxPlan
                  ? maxPlanMessage || MAX_PLAN_MESSAGE
                  : "You are on the highest plan available."}
              </div>
            ) : (
              <>
              <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-slate-900">
                Upgrade Plan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pick a plan, then choose how you want to pay for it.
              </p>
            </div>
                <div className="mx-auto grid max-w-3xl items-start gap-6 sm:grid-cols-2">
                  {activeTier.cards.map((plan) => (
                    <PlanCard
                      key={plan.planId}
                      plan={plan}
                      state={planState(plan)}
                      busy={upgradingId === plan.planId}
                      onUpgrade={startUpgrade}
                      previousName={previousTierName}
                      savings={activeTier.savings}
                      savingsAmount={activeTier.savingsAmount}
                    />
                  ))}
                </div>

                {/* <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                  Monthly and yearly only change{" "}
                  <span className="font-medium text-slate-700">how you pay</span>
                  . All usage limits still reset{" "}
                  <span className="font-medium text-slate-700">monthly</span>.
                </p>

                <h2 className="mt-10 mb-4 text-base font-semibold text-slate-900">
                  Plan Comparison
                </h2>
                <ComparisonTable plans={activeTier.cards} /> */}
              </>
            )}
          </div>

          <BillingHistory />
        </div>
      )}

      {upgrade && (
        <UpgradeDialog
          data={upgrade}
          busy={paying}
          onClose={() => setUpgrade(null)}
          onPay={openCheckout}
        />
      )}
    </PageShell>
  );
};

export default Billing;
