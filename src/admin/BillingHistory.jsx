import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiClock, FiRefreshCw } from "react-icons/fi";
import {
  getSubscriptionHistory,
  getPaymentHistory,
} from "../api/tenantApi";
import { getErrorMessage } from "../api/axios";
import { formatDate, formatPrice } from "../utils/planFormat";

const TABS = [
  { key: "subscriptions", label: "Subscription History" },
  { key: "payments", label: "Payment History" },
];

// Every one of these can come back null, so nothing is rendered blind.
const dash = (value) => (value === null || value === undefined || value === "" ? "—" : value);

const dateCell = (value) => (value ? formatDate(value) : "—");

// Amount always reads with its currency, never as a bare number.
const money = (amount, currency) => {
  if (amount === null || amount === undefined) return "—";
  const value = formatPrice(amount);
  return currency === "INR" || !currency ? `₹${value}` : `${value} ${currency}`;
};

const planLabel = (plan) => {
  if (!plan?.name) return "—";
  return plan.version > 1 ? `${plan.name} v${plan.version}` : plan.name;
};

const Status = ({ value }) => {
  const tone =
    value === "ACTIVE" || value === "SUCCESS"
      ? "bg-emerald-50 text-emerald-700"
      : value === "PENDING" || value === "CREATED"
        ? "bg-amber-50 text-amber-700"
        : value === "FAILED" || value === "CANCELLED" || value === "EXPIRED"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {dash(value)}
    </span>
  );
};

const Table = ({ columns, rows, render, empty }) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <FiClock className="mx-auto mb-3 text-slate-300" size={28} />
        <p className="text-sm text-slate-500">{empty}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            {columns.map((column) => (
              <th key={column} className="px-5 py-3 font-medium text-slate-500">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(render)}</tbody>
      </table>
    </div>
  );
};

const BillingHistory = () => {
  // The tab lives in the URL so a refresh comes back to the same one.
  const [params, setParams] = useSearchParams();
  const requested = params.get("history");
  const tab = TABS.some((item) => item.key === requested)
    ? requested
    : "subscriptions";

  const selectTab = (key) => {
    const next = new URLSearchParams(params);
    next.set("history", key);
    setParams(next, { replace: true });
  };

  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([
      getSubscriptionHistory().then(setSubscriptions),
      getPaymentHistory().then(setPayments),
    ])
      .then(() => setError(""))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const refresh = () => {
    setLoading(true);
    load();
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">History</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your past subscriptions and payments, newest first.
          </p>
        </div>
        <button
          onClick={refresh}
          title="Refresh"
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
        >
          <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => selectTab(item.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === item.key
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : tab === "subscriptions" ? (
        <Table
          columns={[
            "Plan",
            "Billing",
            "Price",
            "Status",
            "Start",
            "End",
            "Grace period",
          ]}
          rows={subscriptions}
          empty="No subscriptions yet. Paid plans you take up will appear here."
          render={(item) => (
            <tr
              key={item.subscriptionId}
              className="border-b border-slate-50 last:border-0"
            >
              <td className="px-5 py-3 font-medium text-slate-800">
                {planLabel(item.plan)}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {dash(item.billingCycle || item.plan?.billingCycle)}
              </td>
              <td className="px-5 py-3 text-slate-800">
                {money(item.planPrice, "INR")}
              </td>
              <td className="px-5 py-3">
                <Status value={item.status} />
              </td>
              <td className="px-5 py-3 text-slate-600">
                {dateCell(item.startDate)}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {dateCell(item.endDate)}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {dateCell(item.gracePeriodEndDate)}
              </td>
            </tr>
          )}
        />
      ) : (
        <Table
          columns={["Date", "Amount", "Status", "Plan", "Billing", "Reference"]}
          rows={payments}
          empty="No payments yet."
          render={(item) => (
            <tr
              key={item.paymentId}
              className="border-b border-slate-50 last:border-0"
            >
              <td className="px-5 py-3 text-slate-600">
                {dateCell(item.paidAt || item.createdAt)}
              </td>
              <td className="px-5 py-3 font-medium text-slate-800">
                {money(item.amount, item.currency)}
              </td>
              <td className="px-5 py-3">
                <Status value={item.status} />
              </td>
              <td className="px-5 py-3 text-slate-600">
                {planLabel(item.subscription?.plan)}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {dash(item.subscription?.billingCycle)}
              </td>
              <td
                className="max-w-[12rem] truncate px-5 py-3 font-mono text-xs text-slate-400"
                title={item.razorpayOrderId || undefined}
              >
                {dash(item.razorpayPaymentId || item.razorpayOrderId)}
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
};

export default BillingHistory;
