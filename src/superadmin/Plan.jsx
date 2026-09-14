import { useEffect, useState } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiStar,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiLoader,
  FiLayers,
  FiX,
  FiCalendar,
} from "react-icons/fi";
import { getPlans, updatePlan, deletePlan } from "../api/planApi";
import { getErrorMessage } from "../api/axios";
import PlanForm from "./PlanForm";
import {
  formatLimit,
  formatPrice,
  formatStorage,
  LIMIT_ROWS,
  RESET_CYCLE,
} from "../utils/planFormat";

const isActivePlan = (plan) => plan.isActive !== false;

// FREE plans carry billingCycle NONE, so they get no /month or /year suffix.
const cycleSuffix = (billingCycle) =>
  billingCycle === "MONTHLY"
    ? "/month"
    : billingCycle === "YEARLY"
      ? "/year"
      : "";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const Badge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const PlanCard = ({ plan, busy, onEdit, onToggleActive, onDelete }) => {
  const active = isActivePlan(plan);
  const isFree = plan.type === "FREE";

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white transition ${
        plan.isPopular ? "border-indigo-300 shadow-sm" : "border-slate-200"
      } ${active ? "hover:shadow-md" : "opacity-70"}`}
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold tracking-wide text-slate-900">
            {plan.name}
          </h3>
          <div className="flex flex-wrap justify-end gap-1.5">
            {plan.isPopular && (
              <Badge tone="amber">
                <FiStar size={11} /> Popular
              </Badge>
            )}
            {active ? <Badge tone="emerald">Active</Badge> : <Badge>Inactive</Badge>}
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-slate-900">
            {isFree ? "Free" : `₹${formatPrice(plan.price)}`}
          </span>
          <span className="text-sm text-slate-400">
            {cycleSuffix(plan.billingCycle)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>{plan.type}</Badge>
          <Badge>{plan.billingCycle}</Badge>
          {plan.planLevel != null && (
            <Badge tone="indigo">Level {plan.planLevel}</Badge>
          )}
          <Badge>Order {plan.displayOrder ?? 0}</Badge>
        </div>
      </div>

      <div className="flex-1 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Limits
          </p>
          <Badge>
            <FiCalendar size={11} /> Resets {RESET_CYCLE}
          </Badge>
        </div>
        <dl className="space-y-2">
          {LIMIT_ROWS.map((row) => (
            <div key={row.key} className="flex justify-between text-sm">
              <dt className="text-slate-500">
                {row.label}
                {row.perMonth && (
                  <span className="text-slate-400"> / month</span>
                )}
              </dt>
              <dd className="font-medium text-slate-800">
                {formatLimit(plan[row.key])}
              </dd>
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <dt className="text-slate-500">Storage</dt>
            <dd className="font-medium text-slate-800">
              {formatStorage(plan.storageLimit)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
          {plan.customDomain && (
            <Badge tone="indigo">
              <FiCheck size={11} /> Custom Domain
            </Badge>
          )}
          {plan.mediaUpload && (
            <Badge tone="indigo">
              <FiCheck size={11} /> Media Upload
            </Badge>
          )}
          <Badge>{plan.analytics} Analytics</Badge>
          <Badge>{plan.emailSupport} Support</Badge>
        </div>

        {/* {plan.razorpayPlanId && (
          <p className="mt-3 truncate font-mono text-xs text-slate-400">
            {plan.razorpayPlanId}
          </p>
        )} */}
      </div>

      <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
        <button
          onClick={() => onEdit(plan)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <FiEdit2 size={14} /> Edit
        </button>
        <button
          onClick={() => onToggleActive(plan)}
          disabled={busy}
          title={active ? "Deactivate plan" : "Activate plan"}
          className="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? (
            <FiLoader size={14} className="animate-spin" />
          ) : active ? (
            <FiEyeOff size={14} />
          ) : (
            <FiEye size={14} />
          )}
        </button>
        <button
          onClick={() => onDelete(plan)}
          title="Delete plan"
          className="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const DeleteDialog = ({ state, busy, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-900">Delete plan</h3>
      <p className="mt-2 text-sm text-slate-500">
        Delete <span className="font-medium text-slate-800">{state.plan.name}</span>?
      </p>
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        If any tenant is subscribed to this plan it is not removed — the backend
        deactivates it instead so existing subscriptions keep working.
      </p>

      {state.error && (
        <div className="mt-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <FiAlertCircle className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {busy && <FiLoader className="animate-spin" />} Delete
        </button>
      </div>
    </div>
  </div>
);

const Plan = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [filter, setFilter] = useState("all");
  const [formPlan, setFormPlan] = useState(null); // null = closed
  const [deleteState, setDeleteState] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadPlans = () =>
    getPlans()
      .then((data) => {
        setPlans(data);
        setLoadError("");
      })
      .catch((error) => setLoadError(getErrorMessage(error)))
      .finally(() => setLoading(false));

  const refreshPlans = () => {
    setLoading(true);
    loadPlans();
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const visible = plans.filter((plan) =>
    filter === "all"
      ? true
      : filter === "active"
        ? isActivePlan(plan)
        : !isActivePlan(plan),
  );

  const countFor = (key) =>
    key === "all"
      ? plans.length
      : plans.filter((plan) =>
          key === "active" ? isActivePlan(plan) : !isActivePlan(plan),
        ).length;

  // An edit can come back as a brand new plan when the old one has subscribers.
  const handleSaved = (message) => {
    setFormPlan(null);
    setNotice({ type: "success", text: message });
    loadPlans();
  };

  const handleToggleActive = async (plan) => {
    setBusyId(plan.planId);
    try {
      const data = await updatePlan(plan.planId, {
        isActive: !isActivePlan(plan),
      });
      setNotice({ type: "success", text: data.message || "Plan updated" });
      loadPlans();
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  // The backend answers 200 either way: deleted, or deactivated because the
  // plan is in use. Its message says which one happened.
  const handleDelete = async () => {
    const plan = deleteState.plan;
    setBusyId(plan.planId);
    try {
      const data = await deletePlan(plan.planId);
      setDeleteState(null);
      setNotice({ type: "success", text: data.message || "Plan deleted" });
      loadPlans();
    } catch (error) {
      setDeleteState({ plan, error: getErrorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Plans</h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading plans..."
                : `${plans.length} plan${plans.length === 1 ? "" : "s"} · ${countFor("active")} active`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              {FILTERS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setFilter(option.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    filter === option.key
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={refreshPlans}
              title="Refresh"
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
            >
              <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setFormPlan({})}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              <FiPlus size={16} /> New Plan
            </button>
          </div>
        </div>

        {notice && (
          <div
            className={`mt-6 flex items-start justify-between gap-3 rounded-lg p-4 text-sm ${
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

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
              <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
              <p className="text-sm text-red-700">{loadError}</p>
              <button
                onClick={refreshPlans}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
              <FiLayers className="mx-auto mb-3 text-slate-300" size={32} />
              <h3 className="font-medium text-slate-800">
                {plans.length === 0 ? "No plans yet" : `No ${filter} plans`}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {plans.length === 0
                  ? "Create your first plan to get started."
                  : "Try a different filter."}
              </p>
              {plans.length === 0 && (
                <button
                  onClick={() => setFormPlan({})}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  <FiPlus size={16} /> New Plan
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((plan) => (
                <PlanCard
                  key={plan.planId}
                  plan={plan}
                  busy={busyId === plan.planId}
                  onEdit={setFormPlan}
                  onToggleActive={handleToggleActive}
                  onDelete={(p) => setDeleteState({ plan: p, error: "" })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {formPlan && (
        <PlanForm
          plan={formPlan.planId ? formPlan : null}
          onClose={() => setFormPlan(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteState && (
        <DeleteDialog
          state={deleteState}
          busy={busyId === deleteState.plan.planId}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default Plan;
