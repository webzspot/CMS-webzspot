import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProjectBrowser from "./ProjectBrowser";
import { clearDrill } from "./useDrill";
import {
  FiArrowLeft,
  FiRefreshCw,
  FiAlertCircle,
  FiInbox,
  FiActivity,
  FiCalendar,
  FiCreditCard,
  FiUser,
  FiMail,
  FiCheckCircle,
  FiClock,
  FiFolder,
  FiDatabase,
  FiKey,
  FiUsers,
  FiDownload,
  FiUpload,
  FiHardDrive,
} from "react-icons/fi";
import {
  getTenant,
  getTenantAdmin,
  getTenantUsers,
  getTenantSubscription,
  getTenantSubscriptionHistory,
  getTenantPaymentHistory,
  getTenantUsage,
  getTenantProjects,
} from "../api/superAdminApi";
import { getErrorMessage } from "../api/axios";
import {
  formatDate,
  formatPrice,
  formatLimit,
  formatBytes,
  cycleLabel,
} from "../utils/planFormat";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "subscription", label: "Subscription" },
  { key: "payments", label: "Payments" },
  { key: "projects", label: "Projects" },
];

const dash = (value) =>
  value === null || value === undefined || value === "" ? "—" : value;

const dateCell = (value) => (value ? formatDate(value) : "—");

const money = (amount, currency) => {
  if (amount === null || amount === undefined) return "—";
  const value = formatPrice(amount);
  return currency && currency !== "INR" ? `${value} ${currency}` : `₹${value}`;
};

const planLabel = (plan) =>
  !plan?.name ? "—" : plan.version > 1 ? `${plan.name} v${plan.version}` : plan.name;

const Status = ({ value }) => {
  const tone =
    value === "ACTIVE" || value === "SUCCESS" || value === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700"
      : value === "PENDING" || value === "CREATED" || value === "DRAFT"
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

const Card = ({ title, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-6">
    <h2 className="mb-5 text-base font-semibold text-slate-900">{title}</h2>
    {children}
  </div>
);

// One usage figure against its plan allowance. The bar is skipped when there
// is no limit to measure against, so nothing implies a cap that is not there.
const UsageStat = ({ icon: Icon, label, used, limit, format = formatLimit }) => {
  const hasLimit = limit !== null && limit !== undefined && Number(limit) > 0;
  const percent = hasLimit
    ? Math.min(100, Math.round((Number(used || 0) / Number(limit)) * 100))
    : 0;
  const tone =
    percent >= 100
      ? "bg-red-500"
      : percent >= 80
        ? "bg-amber-500"
        : "bg-indigo-500";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={15} />
        <span className="text-xs font-medium tracking-wider uppercase">
          {label}
        </span>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-slate-900">
          {format(used ?? 0)}
        </span>
        {hasLimit && (
          <span className="text-sm text-slate-400">of {format(limit)}</span>
        )}
      </p>
      {hasLimit ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${tone}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">No plan limit</p>
      )}
    </div>
  );
};

// A labelled value with an icon, used where a progress bar makes no sense.
const Detail = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon size={15} />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-sm font-medium text-slate-800 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

const Empty = ({ text }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
    <FiInbox className="mx-auto mb-3 text-slate-300" size={28} />
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

const Table = ({ columns, rows, render, empty }) =>
  rows.length === 0 ? (
    <Empty text={empty} />
  ) : (
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

const TenantDetail = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some((item) => item.key === requested)
    ? requested
    : "overview";

  // Any tab click, Projects included, lands on that tab's top level, so it
  // doubles as a way out of a drilled-in project.
  const selectTab = (key) => {
    const next = clearDrill(new URLSearchParams(params));
    next.set("tab", key);
    setParams(next, { replace: true });
  };

  const [tenant, setTenant] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [usage, setUsage] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Admin, subscription and usage answer 404 when the tenant simply has none
  // of them, so only the tenant itself failing counts as an error.
  const load = (id) =>
    Promise.all([
      getTenant(id)
        .then((data) => {
          setTenant(data);
          setError("");
        })
        .catch((err) => setError(getErrorMessage(err))),
      getTenantAdmin(id)
        .then(setAdmin)
        .catch(() => setAdmin(null)),
      getTenantUsers(id)
        .then(setUsers)
        .catch(() => setUsers([])),
      getTenantSubscription(id)
        .then(setSubscription)
        .catch(() => setSubscription(null)),
      getTenantSubscriptionHistory(id)
        .then(setHistory)
        .catch(() => setHistory([])),
      getTenantPaymentHistory(id)
        .then(setPayments)
        .catch(() => setPayments([])),
      getTenantUsage(id)
        .then(setUsage)
        .catch(() => setUsage(null)),
      getTenantProjects(id)
        .then(setProjects)
        .catch(() => setProjects([])),
    ]).finally(() => setLoading(false));

  useEffect(() => {
    load(tenantId);
  }, [tenantId]);

  // The nonce also re-fetches whatever the Projects tab is drilled into.
  const [nonce, setNonce] = useState(0);
  const refresh = () => {
    setLoading(true);
    setNonce((value) => value + 1);
    load(tenantId);
  };

  const plan = subscription?.plan;

  // This endpoint returns the plan's storageLimit in BYTES, unlike the plans
  // API which converts to MB. Reading it as MB showed "2048000 GB".
  const planStorageBytes =
    plan?.storageLimit === null || plan?.storageLimit === undefined
      ? null
      : Number(plan.storageLimit);

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold text-slate-900">
                  {tenant?.name || "Tenant"}
                </h1>
                {tenant && (
                  <Status value={tenant.isActive ? "ACTIVE" : "INACTIVE"} />
                )}
              </div>
              <p className="mt-1 truncate font-mono text-sm text-slate-400">
                {tenant?.slug}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <button
                onClick={refresh}
                title="Refresh"
                className="rounded-lg border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
              >
                <FiRefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={() => navigate("/super-admin/tenants")}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
              >
                <FiArrowLeft size={16} /> Back
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-1">
            {TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => selectTab(item.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === item.key
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
            <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : tab === "overview" ? (
          <div className="space-y-6">
            {/* Tenant and its administrator read as one identity block */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-1">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg font-semibold text-indigo-600">
                    {(tenant?.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900">
                      {dash(tenant?.name)}
                    </p>
                    <p className="truncate font-mono text-xs text-slate-400">
                      {dash(tenant?.slug)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                  <Detail
                    icon={FiActivity}
                    label="Status"
                    value={tenant?.isActive ? "Active" : "Inactive"}
                  />
                  <Detail
                    icon={FiCalendar}
                    label="Customer since"
                    value={dateCell(tenant?.createdAt)}
                  />
                  <Detail
                    icon={FiCreditCard}
                    label="Plan"
                    value={
                      subscription ? planLabel(subscription.plan) : "Free plan"
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
                <h2 className="mb-5 text-base font-semibold text-slate-900">
                  Administrator
                </h2>
                {admin ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Detail icon={FiUser} label="Name" value={dash(admin.name)} />
                    <Detail
                      icon={FiMail}
                      label="Email"
                      value={dash(admin.email)}
                    />
                    <Detail
                      icon={admin.isEmailVerified ? FiCheckCircle : FiAlertCircle}
                      label="Email verified"
                      value={admin.isEmailVerified ? "Verified" : "Not verified"}
                    />
                    <Detail
                      icon={FiClock}
                      label="Last login"
                      value={dateCell(admin.lastLoginAt)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No administrator found for this tenant.
                  </p>
                )}
              </div>
            </div>

            {/* Usage against the plan's own allowances, so a tenant close to a
                limit is visible at a glance rather than needing arithmetic. */}
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">Usage</h2>
                <p className="text-xs text-slate-400">
                  {usage?.usageResetAt
                    ? `Resets ${formatDate(usage.usageResetAt)}`
                    : "Resets monthly"}
                </p>
              </div>

              {usage ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <UsageStat
                    icon={FiFolder}
                    label="Projects"
                    used={usage.projectsUsed}
                    limit={plan?.projectLimit}
                  />
                  <UsageStat
                    icon={FiDatabase}
                    label="Collections"
                    used={usage.collectionsUsed}
                    limit={plan?.collectionLimit}
                  />
                  <UsageStat
                    icon={FiKey}
                    label="API keys"
                    used={usage.apiKeysUsed}
                    limit={plan?.apiKeyLimit}
                  />
                  <UsageStat
                    icon={FiUsers}
                    label="Team members"
                    used={usage.teamMembersUsed}
                    limit={plan?.teamMemberLimit}
                  />
                  <UsageStat
                    icon={FiDownload}
                    label="GET / month"
                    used={usage.getRequestsUsed}
                    limit={plan?.getRequestsLimit}
                  />
                  <UsageStat
                    icon={FiUpload}
                    label="Writes / month"
                    used={usage.writeRequestsUsed}
                    limit={plan?.writeRequestsLimit}
                  />
                  <UsageStat
                    icon={FiHardDrive}
                    label="Storage"
                    used={usage.storageUsedBytes}
                    limit={planStorageBytes}
                    format={formatBytes}
                  />
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-slate-400">
                      <FiRefreshCw size={15} />
                      <span className="text-xs font-medium tracking-wider uppercase">
                        Usage resets
                      </span>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-slate-900">
                      {dateCell(usage.usageResetAt)}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      Request counters return to zero
                    </p>
                  </div>
                </div>
              ) : (
                <Empty text="No usage recorded for this tenant yet." />
              )}
            </div>
          </div>
        ) : tab === "users" ? (
          <Table
            columns={["Name", "Email", "Verified", "Last login", "Created"]}
            rows={users}
            empty="This tenant has no users yet."
            render={(user) => (
              <tr
                key={user.userId}
                className="border-b border-slate-50 last:border-0"
              >
                <td className="px-5 py-3 font-medium text-slate-800">
                  {dash(user.name)}
                </td>
                <td className="px-5 py-3 text-slate-600">{dash(user.email)}</td>
                <td className="px-5 py-3 text-slate-600">
                  {user.isEmailVerified ? "Yes" : "No"}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {dateCell(user.lastLoginAt)}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {dateCell(user.createdAt)}
                </td>
              </tr>
            )}
          />
        ) : tab === "subscription" ? (
          <div className="space-y-6">
            {subscription ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* Plan, price and term lead; the ids stay out of the way */}
                <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-100 p-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-900 capitalize">
                        {planLabel(plan)}
                      </h2>
                      <Status value={subscription.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {dash(subscription.billingCycle)} billing
                      {plan?.planLevel != null && ` · Level ${plan.planLevel}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold tracking-tight text-slate-900">
                      {money(subscription.planPrice, "INR")}
                    </p>
                    <p className="text-xs text-slate-400">
                      per {cycleLabel(subscription.billingCycle) || "cycle"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 border-b border-slate-100 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail
                    icon={FiCalendar}
                    label="Started"
                    value={dateCell(subscription.startDate)}
                  />
                  <Detail
                    icon={FiClock}
                    label="Renews / ends"
                    value={dateCell(subscription.endDate)}
                  />
                  <Detail
                    icon={FiAlertCircle}
                    label="Grace period"
                    value={dateCell(subscription.gracePeriodEndDate)}
                  />
                  <Detail
                    icon={FiCreditCard}
                    label="Razorpay"
                    value={dash(subscription.razorpaySubscriptionId)}
                    mono
                  />
                </div>

                {plan && (
                  <div className="p-6">
                    <p className="mb-4 text-xs font-medium tracking-wider text-slate-400 uppercase">
                      What this plan allows
                    </p>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      <Detail
                        icon={FiFolder}
                        label="Projects"
                        value={formatLimit(plan.projectLimit)}
                      />
                      <Detail
                        icon={FiDatabase}
                        label="Collections"
                        value={formatLimit(plan.collectionLimit)}
                      />
                      <Detail
                        icon={FiKey}
                        label="API keys"
                        value={formatLimit(plan.apiKeyLimit)}
                      />
                      <Detail
                        icon={FiUsers}
                        label="Team members"
                        value={formatLimit(plan.teamMemberLimit)}
                      />
                      <Detail
                        icon={FiHardDrive}
                        label="Storage"
                        value={formatBytes(planStorageBytes)}
                      />
                      <Detail
                        icon={FiDownload}
                        label="GET / month"
                        value={formatLimit(plan.getRequestsLimit)}
                      />
                      <Detail
                        icon={FiUpload}
                        label="Writes / month"
                        value={formatLimit(plan.writeRequestsLimit)}
                      />
                      <Detail
                        icon={FiRefreshCw}
                        label="Limits reset"
                        value="Monthly"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card title="Current subscription">
                <p className="text-sm text-slate-500">
                  No active paid subscription. This tenant is on the free plan.
                </p>
              </Card>
            )}

            <div>
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Subscription history
              </h2>
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
                rows={history}
                empty="No paid subscriptions yet."
                render={(item) => (
                  <tr
                    key={item.subscriptionId}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {planLabel(item.plan)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {dash(item.billingCycle)}
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
            </div>
          </div>
        ) : tab === "payments" ? (
          <Table
            columns={["Date", "Amount", "Status", "Plan", "Billing", "Reference"]}
            rows={payments}
            empty="No payments recorded for this tenant."
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
        ) : (
          // Projects drill in place: a project, then its collections and
          // forms, all under this tenant header. Forms live inside a project,
          // so they are reached from there rather than listed at tenant level.
          <ProjectBrowser projects={projects} nonce={nonce} onRetry={refresh} />
        )}
      </div>
    </div>
  );
};

export default TenantDetail;
