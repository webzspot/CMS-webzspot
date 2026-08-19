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
} from "react-icons/fi";
import { getPlans, updatePlan, deletePlan } from "../api/planApi";
import { getErrorMessage } from "../api/axios";
import PlanForm from "./PlanForm";
import {
  formatLimit,
  formatPrice,
  formatStorage,
  LIMIT_ROWS,
} from "../utils/planFormat";

const isActivePlan = (plan) => plan.isActive !== false;

const Badge = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const PlanCard = ({ plan, billing, busy, onEdit, onToggleActive, onDelete }) => {
  const active = isActivePlan(plan);
  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

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
            {!active && <Badge>Inactive</Badge>}
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-slate-900">
            ₹{formatPrice(price)}
          </span>
          <span className="text-sm text-slate-400">
            /{billing === "monthly" ? "month" : "year"}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Display order {plan.displayOrder ?? "-"}
        </p>
      </div>

      <div className="flex-1 px-5 py-4">
        <dl className="space-y-2">
          {LIMIT_ROWS.map((row) => (
            <div key={row.key} className="flex justify-between text-sm">
              <dt className="text-slate-500">{row.label}</dt>
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
              <FiCheck size={11} /> Custom Domain Included
            </Badge>
          )}
          {plan.mediaUpload && (
            <Badge tone="indigo">
              <FiCheck size={11} /> Media Upload Included
            </Badge>
          )}
          <Badge>{plan.analytics} Analytics</Badge>
          <Badge>{plan.emailSupport} Support</Badge>
        </div>
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

const DeleteDialog = ({ state, busy, onCancel, onConfirm, onDeactivate }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-900">Delete plan</h3>
      <p className="mt-2 text-sm text-slate-500">
        Are you sure you want to delete{" "}
        <span className="font-medium text-slate-800">{state.plan.name}</span>?
        This action cannot be undone.
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
        {state.error ? (
          <button
            onClick={onDeactivate}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:opacity-60"
          >
            {busy && <FiLoader className="animate-spin" />} Deactivate Instead
          </button>
        ) : (
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <FiLoader className="animate-spin" />} Delete
          </button>
        )}
      </div>
    </div>
  </div>
);

const Plan = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [billing, setBilling] = useState("monthly");
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
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

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

  const handleDelete = async () => {
    const plan = deleteState.plan;
    setBusyId(plan.planId);
    try {
      const data = await deletePlan(plan.planId);
      setDeleteState(null);
      setNotice({ type: "success", text: data.message || "Plan deleted" });
      loadPlans();
    } catch (error) {
      // Plan in use by a subscription: show the backend message + deactivate option
      setDeleteState({ plan, error: getErrorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeactivateFromDialog = async () => {
    const plan = deleteState.plan;
    setBusyId(plan.planId);
    try {
      const data = await updatePlan(plan.planId, { isActive: false });
      setDeleteState(null);
      setNotice({ type: "success", text: data.message || "Plan deactivated" });
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
                : `${plans.length} plan${plans.length === 1 ? "" : "s"} available`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              {["monthly", "yearly"].map((option) => (
                <button
                  key={option}
                  onClick={() => setBilling(option)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                    billing === option
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {option}
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
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
              <FiLayers className="mx-auto mb-3 text-slate-300" size={32} />
              <h3 className="font-medium text-slate-800">No plans yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Create your first plan to get started.
              </p>
              <button
                onClick={() => setFormPlan({})}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <FiPlus size={16} /> New Plan
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.planId}
                  plan={plan}
                  billing={billing}
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
          onDeactivate={handleDeactivateFromDialog}
        />
      )}
    </div>
  );
};

export default Plan;
