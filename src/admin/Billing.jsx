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
} from "react-icons/fi";
import PageShell from "../components/PageShell";
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
  planSummary,
  planFeatures,
  yearlySavings,
  LIMIT_ROWS,
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
  const price =
    billingCycle === "YEARLY" ? plan?.yearlyPrice : plan?.monthlyPrice;

  const rows = [
    { label: "Current Plan", value: plan?.name },
    { label: "Billing", value: billingCycle },
    {
      label: "Price",
      value: `₹${formatPrice(price)} / ${
        billingCycle === "YEARLY" ? "year" : "month"
      }`,
    },
    { label: "Start Date", value: formatDate(startDate) },
    { label: "End Date", value: formatDate(endDate) },
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

  // Backend rule: a cheaper plan needs Super Admin approval
  if (state === "downgrade") {
    return (
      <div className={`${base} cursor-default bg-slate-50 text-slate-400`}>
        Downgrade needs approval
      </div>
    );
  }

  // No active subscription, so there is nothing to upgrade from
  return (
    <div className={`${base} cursor-default bg-slate-50 text-slate-400`}>
      No active subscription
    </div>
  );
};

const PlanCard = ({ plan, billing, state, busy, onUpgrade, previousName }) => {
  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const highlight = plan.isPopular;

  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 transition ${
        highlight
          ? "border-indigo-200 bg-indigo-50/50 shadow-sm"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
        {highlight && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 shadow-sm">
            <FiStar size={11} /> Popular
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
        {billing === "monthly"
          ? "Per month"
          : `Per year · ₹${formatPrice(plan.monthlyPrice)} billed monthly`}
      </p>

      <PlanAction state={state} busy={busy} onUpgrade={() => onUpgrade(plan)} />

      <div className="mt-6 border-t border-slate-200/80 pt-5">
        <p className="text-sm font-semibold text-slate-900">Features</p>
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

const UpgradeDialog = ({ data, busy, onClose, onPay }) => {
  const { currentPlan, newPlan, upgrade } = data;

  const rows = [
    { label: `Current plan (${currentPlan?.name})`, value: currentPlan?.price },
    { label: `New plan (${newPlan?.name})`, value: newPlan?.price },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Confirm upgrade</h3>
        <p className="mt-1 text-sm text-slate-500">
          {currentPlan?.name} → {newPlan?.name} ({newPlan?.billingCycle})
        </p>

        <dl className="mt-5 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between">
              <dt className="text-slate-500">{row.label}</dt>
              <dd className="font-medium text-slate-800">
                ₹{formatPrice(row.value)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <dt className="font-medium text-slate-700">Amount to pay</dt>
            <dd className="font-semibold text-slate-900">
              ₹{formatPrice(upgrade?.amountToPay)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-slate-400">
          This amount is calculated by the backend and cannot be changed here.
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
            Pay ₹{formatPrice(upgrade?.amountToPay)}
          </button>
        </div>
      </div>
    </div>
  );
};

const Yes = () => <FiCheck className="mx-auto text-emerald-600" size={16} />;
const No = () => <FiMinus className="mx-auto text-slate-300" size={16} />;

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
            <td className="px-5 py-3 text-slate-500">{row.label}</td>
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
  const [billing, setBilling] = useState("monthly");
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
    loadBilling(tenantId);
  };

  useEffect(() => {
    loadBilling(tenantId);
  }, [tenantId]);

  const savings = yearlySavings(plans);
  const currentPlanId = subscription?.plan?.planId;
  const currentCycle = subscription?.billingCycle;
  const currentPrice = Number(
    (currentCycle === "YEARLY"
      ? subscription?.plan?.yearlyPrice
      : subscription?.plan?.monthlyPrice) ?? 0,
  );

  // Mirrors the backend upgrade rules: needs an active subscription, the target
  // must cost more, and it cannot be the plan/cycle already in use.
  const planState = (plan) => {
    const samePlanAndCycle =
      plan.planId === currentPlanId && currentCycle === billing.toUpperCase();
    if (samePlanAndCycle) return "current";
    if (!subscription || !tenantId) return "none";

    const price = Number(
      billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice,
    );
    if (price > currentPrice) return "upgrade";
    return "downgrade";
  };

  const startUpgrade = async (plan) => {
    setUpgradingId(plan.planId);
    setNotice(null);
    try {
      const data = await upgradeSubscription({
        tenantId,
        planId: plan.planId,
        billingCycle: billing.toUpperCase(),
      });
      setUpgrade(data);
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

    const checkout = new window.Razorpay({
      key: upgrade.razorpay.keyId,
      subscription_id: upgrade.razorpay.subscriptionId,
      name: "CMSX",
      description: `Upgrade to ${upgrade.newPlan?.name}`,
      theme: { color: "#000000" },
      handler: () => {
        // Razorpay's callback is not proof of payment. The backend confirms
        // through the webhook, so we only refresh and wait.
        setUpgrade(null);
        setNotice({
          type: "success",
          text: "Payment submitted. Your plan updates once the payment is confirmed.",
        });
        refresh();
      },
      modal: {
        ondismiss: () => {
          setPaying(false);
          setNotice({ type: "error", text: "Payment cancelled." });
        },
      },
    });

    checkout.open();
    setPaying(false);
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
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-slate-900">
                Upgrade Plan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pricing plans designed to meet your needs as you grow.
              </p>

              <div className="mt-5 inline-flex rounded-full bg-slate-100 p-1">
                {["monthly", "yearly"].map((option) => (
                  <button
                    key={option}
                    onClick={() => setBilling(option)}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      billing === option
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {option === "monthly" ? "Monthly" : "Annual"}
                    {option === "yearly" && savings > 0 && (
                      <span
                        className={
                          billing === "yearly"
                            ? "ml-1.5 text-xs text-indigo-100"
                            : "ml-1.5 text-xs text-emerald-600"
                        }
                      >
                        Save {savings}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {plansError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                {plansError}
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No active plans available right now.
              </div>
            ) : (
              <>
                <div className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {plans.map((plan, index) => (
                    <PlanCard
                      key={plan.planId}
                      plan={plan}
                      billing={billing}
                      state={planState(plan)}
                      busy={upgradingId === plan.planId}
                      onUpgrade={startUpgrade}
                      previousName={plans[index - 1]?.name}
                    />
                  ))}
                </div>

                <h2 className="mt-10 mb-4 text-base font-semibold text-slate-900">
                  Plan Comparison
                </h2>
                <ComparisonTable plans={plans} />
              </>
            )}
          </div>
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
