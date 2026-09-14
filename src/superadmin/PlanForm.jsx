import { useState } from "react";
import { FiX, FiLoader, FiInfo } from "react-icons/fi";
import { createPlan, updatePlan } from "../api/planApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import { RESET_CYCLE } from "../utils/planFormat";

// FREE plans have no cycle and no price. PAID plans must have both.
const CYCLES_FOR = { FREE: ["NONE"], PAID: ["MONTHLY", "YEARLY"] };

const NUMBER_FIELDS = [
  "price",
  "planLevel",
  "projectLimit",
  "collectionLimit",
  "apiKeyLimit",
  "teamMemberLimit",
  "storageLimit",
  "getRequestsLimit",
  "writeRequestsLimit",
  "displayOrder",
];

// Everything the create endpoint refuses to work without.
const REQUIRED_FIELDS = [
  "name",
  "type",
  "billingCycle",
  "price",
  "projectLimit",
  "collectionLimit",
  "apiKeyLimit",
  "teamMemberLimit",
  "storageLimit",
  "getRequestsLimit",
  "writeRequestsLimit",
  "analytics",
  "emailSupport",
];

const LIMIT_FIELDS = [
  { key: "projectLimit", label: "Project Limit" },
  { key: "collectionLimit", label: "Collection Limit" },
  { key: "apiKeyLimit", label: "API Key Limit" },
  { key: "teamMemberLimit", label: "Team Member Limit" },
  { key: "storageLimit", label: "Storage Limit (MB)" },
  { key: "getRequestsLimit", label: "GET Requests Limit" },
  { key: "writeRequestsLimit", label: "WRITE Requests Limit" },
];

const ANALYTICS_OPTIONS = ["BASIC", "ADVANCED"];
const SUPPORT_OPTIONS = ["COMMUNITY", "EMAIL", "PRIORITY"];

// Keep whatever value the API already stored, even if it is not in our list.
const withCurrent = (options, value) =>
  value && !options.includes(value) ? [value, ...options] : options;

const toFormValues = (plan) => ({
  name: plan?.name ?? "",
  type: plan?.type ?? "PAID",
  billingCycle: plan?.billingCycle ?? "MONTHLY",
  price: plan?.price ?? "",
  planLevel: plan?.planLevel ?? "",
  projectLimit: plan?.projectLimit ?? "",
  collectionLimit: plan?.collectionLimit ?? "",
  apiKeyLimit: plan?.apiKeyLimit ?? "",
  teamMemberLimit: plan?.teamMemberLimit ?? "",
  storageLimit: plan?.storageLimit ?? "",
  getRequestsLimit: plan?.getRequestsLimit ?? "",
  writeRequestsLimit: plan?.writeRequestsLimit ?? "",
  customDomain: plan?.customDomain ?? false,
  mediaUpload: plan?.mediaUpload ?? false,
  analytics: plan?.analytics ?? "BASIC",
  emailSupport: plan?.emailSupport ?? "COMMUNITY",
  displayOrder: plan?.displayOrder ?? 0,
  isPopular: plan?.isPopular ?? false,
  isActive: plan?.isActive ?? true,
});

const castValue = (key, value) =>
  NUMBER_FIELDS.includes(key) ? Number(value) : value;

const Toggle = ({ label, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300"
  >
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-indigo-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </span>
  </button>
);

const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
    </label>
    {children}
    {error ? (
      <p className="mt-1 text-xs text-red-600">{error}</p>
    ) : hint ? (
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    ) : null}
  </div>
);

// Scrolling the page with the cursor over a focused number input edits its
// value in Chrome. Dropping focus on wheel lets the page scroll normally and
// leaves the number alone.
const blurOnWheel = (event) => event.currentTarget.blur();

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400 ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-slate-200 focus:border-indigo-500"
  }`;

const PlanForm = ({ plan, onClose, onSaved }) => {
  const isEdit = Boolean(plan);
  const [initialValues] = useState(() => toFormValues(plan));
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const isFree = values.type === "FREE";

  const setValue = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // Switching the type drags the cycle and price with it, so the form can never
  // send a combination the backend rejects.
  const setType = (type) => {
    setValues((prev) => ({
      ...prev,
      type,
      billingCycle: type === "FREE" ? "NONE" : "MONTHLY",
      price: type === "FREE" ? 0 : "",
    }));
    setErrors({});
  };

  const validate = () => {
    const nextErrors = {};

    REQUIRED_FIELDS.forEach((key) => {
      if (values[key] === "" || values[key] === null) {
        nextErrors[key] = "This field is required";
      }
    });

    NUMBER_FIELDS.forEach((key) => {
      if (values[key] !== "" && Number.isNaN(Number(values[key]))) {
        nextErrors[key] = "Enter a valid number";
      }
    });

    // Mirrors the backend rules so the admin sees them before submitting.
    const price = Number(values.price);
    if (isFree && price !== 0) {
      nextErrors.price = "A free plan must be priced at 0";
    }
    if (!isFree && !nextErrors.price && price <= 0) {
      nextErrors.price = "A paid plan must cost more than 0";
    }
    if (!CYCLES_FOR[values.type]?.includes(values.billingCycle)) {
      nextErrors.billingCycle = isFree
        ? "A free plan must use NONE"
        : "Choose monthly or yearly";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Create sends every filled field, edit sends only what actually changed.
  const buildPayload = () => {
    const payload = {};

    Object.keys(values).forEach((key) => {
      if (!isEdit && key === "isActive") return;
      if (values[key] === "") return;
      if (isEdit && String(initialValues[key]) === String(values[key])) return;
      payload[key] = castValue(key, values[key]);
    });

    // type, cycle and price only make sense together
    if (isEdit && (payload.type || payload.billingCycle || payload.price)) {
      payload.type = values.type;
      payload.billingCycle = values.billingCycle;
      payload.price = Number(values.price);
    }

    if (payload.name) payload.name = payload.name.trim();
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    const payload = buildPayload();

    if (isEdit && Object.keys(payload).length === 0) {
      setFormError("Nothing changed yet.");
      return;
    }

    setSaving(true);
    try {
      const data = isEdit
        ? await updatePlan(plan.planId, payload)
        : await createPlan(payload);
      onSaved(data.message || "Plan saved successfully", data.plan);
    } catch (error) {
      const message = getErrorMessage(error);
      // 409 = an active plan with this name + type + cycle already exists
      if (getErrorStatus(error) === 409) {
        setErrors((prev) => ({ ...prev, name: message }));
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEdit ? "Edit Plan" : "Create Plan"}
            </h2>
            <p className="text-sm text-slate-500">
              {isEdit
                ? "Only the fields you change will be sent."
                : "Fill in the plan details below."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="space-y-8 px-6 py-6">
          <section>
            <h3 className="mb-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Basic Details
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plan Name" error={errors.name}>
                <input
                  type="text"
                  value={values.name}
                  onChange={(e) => setValue("name", e.target.value)}
                  placeholder="Professional"
                  className={inputClass(errors.name)}
                />
              </Field>

              <Field label="Type" error={errors.type}>
                <div className="flex gap-2">
                  {["FREE", "PAID"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setType(option)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                        values.type === option
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field
                label="Billing Cycle"
                error={errors.billingCycle}
                hint={isFree ? "Free plans are never billed" : undefined}
              >
                <select
                  value={values.billingCycle}
                  onChange={(e) => setValue("billingCycle", e.target.value)}
                  disabled={isFree}
                  className={inputClass(errors.billingCycle)}
                >
                  {CYCLES_FOR[values.type].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Price (₹)"
                error={errors.price}
                hint={
                  isFree
                    ? "Locked to 0 for free plans"
                    : "Charged once per billing cycle"
                }
              >
                <input
                  type="number"
                  value={values.price}
                  onChange={(e) => setValue("price", e.target.value)}
                  onWheel={blurOnWheel}
                  disabled={isFree}
                  placeholder="649"
                  className={inputClass(errors.price)}
                />
              </Field>

              <Field
                label="Plan Level"
                error={errors.planLevel}
                hint="Higher level = better plan"
              >
                <input
                  type="number"
                  value={values.planLevel}
                  onChange={(e) => setValue("planLevel", e.target.value)}
                  onWheel={blurOnWheel}
                  placeholder="1"
                  className={inputClass(errors.planLevel)}
                />
              </Field>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              The level ranks plans against each other, so a tenant is only
              offered plans above their own. Give the monthly and yearly version
              of the same plan the same level.
            </p>

            {!isFree && (
              <p className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                <FiInfo className="mt-0.5 shrink-0" />
                The Razorpay plan is created by the backend. Changing the price
                or cycle later replaces it automatically.
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Limits
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Use <span className="font-medium text-slate-500">-1</span> for
              unlimited. Storage is in MB (1024 MB = 1 GB). GET and WRITE
              allowances reset{" "}
              <span className="font-medium text-slate-500">{RESET_CYCLE}</span>,
              whatever the billing cycle.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LIMIT_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  error={errors[field.key]}
                >
                  <input
                    type="number"
                    value={values[field.key]}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    onWheel={blurOnWheel}
                    placeholder="0"
                    className={inputClass(errors[field.key])}
                  />
                </Field>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Features
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Analytics" error={errors.analytics}>
                <select
                  value={values.analytics}
                  onChange={(e) => setValue("analytics", e.target.value)}
                  className={inputClass(errors.analytics)}
                >
                  {withCurrent(ANALYTICS_OPTIONS, values.analytics).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Email Support" error={errors.emailSupport}>
                <select
                  value={values.emailSupport}
                  onChange={(e) => setValue("emailSupport", e.target.value)}
                  className={inputClass(errors.emailSupport)}
                >
                  {withCurrent(SUPPORT_OPTIONS, values.emailSupport).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Toggle
                label="Custom Domain"
                checked={values.customDomain}
                onChange={(v) => setValue("customDomain", v)}
              />
              <Toggle
                label="Media Upload"
                checked={values.mediaUpload}
                onChange={(v) => setValue("mediaUpload", v)}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Display
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Display Order"
                error={errors.displayOrder}
                hint="Lower shows first"
              >
                <input
                  type="number"
                  value={values.displayOrder}
                  onChange={(e) => setValue("displayOrder", e.target.value)}
                  onWheel={blurOnWheel}
                  placeholder="0"
                  className={inputClass(errors.displayOrder)}
                />
              </Field>
              <div className="flex items-end">
                <Toggle
                  label="Popular Plan"
                  checked={values.isPopular}
                  onChange={(v) => setValue("isPopular", v)}
                />
              </div>
              {isEdit && (
                <div className="flex items-end">
                  <Toggle
                    label="Active"
                    checked={values.isActive}
                    onChange={(v) => setValue("isActive", v)}
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <p className="text-sm text-red-600">{formError}</p>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving && <FiLoader className="animate-spin" />}
              {isEdit ? "Save Changes" : "Create Plan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlanForm;
