import { useState } from "react";
import { FiX, FiLoader } from "react-icons/fi";
import { createPlan, updatePlan } from "../api/planApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";

const NUMBER_FIELDS = [
  "monthlyPrice",
  "yearlyPrice",
  "projectLimit",
  "collectionLimit",
  "apiKeyLimit",
  "teamMemberLimit",
  "storageLimit",
  "getRequestsLimit",
  "writeRequestsLimit",
  "displayOrder",
];

const REQUIRED_FIELDS = [
  "name",
  "monthlyPrice",
  "yearlyPrice",
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

const PRICE_FIELDS = [
  { key: "monthlyPrice", label: "Monthly Price (₹)" },
  { key: "yearlyPrice", label: "Yearly Price (₹)" },
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

const ANALYTICS_OPTIONS = ["Basic", "Advanced"];
const SUPPORT_OPTIONS = ["Community", "Email", "Standard", "Priority"];

// Keep whatever value the API already stored, even if it is not in our list.
const withCurrent = (options, value) =>
  value && !options.includes(value) ? [value, ...options] : options;

const toFormValues = (plan) => ({
  name: plan?.name ?? "",
  monthlyPrice: plan?.monthlyPrice ?? "",
  yearlyPrice: plan?.yearlyPrice ?? "",
  projectLimit: plan?.projectLimit ?? "",
  collectionLimit: plan?.collectionLimit ?? "",
  apiKeyLimit: plan?.apiKeyLimit ?? "",
  teamMemberLimit: plan?.teamMemberLimit ?? "",
  storageLimit: plan?.storageLimit ?? "",
  getRequestsLimit: plan?.getRequestsLimit ?? "",
  writeRequestsLimit: plan?.writeRequestsLimit ?? "",
  customDomain: plan?.customDomain ?? false,
  mediaUpload: plan?.mediaUpload ?? false,
  analytics: plan?.analytics ?? "Basic",
  emailSupport: plan?.emailSupport ?? "Standard",
  displayOrder: plan?.displayOrder ?? "",
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

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-100 ${
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

  const setValue = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
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
      onSaved(data.message || "Plan saved successfully");
    } catch (error) {
      const message = getErrorMessage(error);
      // 409 = duplicate plan name, show it next to the name field
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
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Plan Name" error={errors.name}>
                <input
                  type="text"
                  value={values.name}
                  onChange={(e) => setValue("name", e.target.value)}
                  placeholder="Starter"
                  className={inputClass(errors.name)}
                />
              </Field>
              {PRICE_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  error={errors[field.key]}
                >
                  <input
                    type="number"
                    value={values[field.key]}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder="0"
                    className={inputClass(errors[field.key])}
                  />
                </Field>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Limits
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Use <span className="font-medium text-slate-500">-1</span> for
              unlimited. Storage is in MB (1024 MB = 1 GB).
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
                  {withCurrent(ANALYTICS_OPTIONS, values.analytics).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Email Support" error={errors.emailSupport}>
                <select
                  value={values.emailSupport}
                  onChange={(e) => setValue("emailSupport", e.target.value)}
                  className={inputClass(errors.emailSupport)}
                >
                  {withCurrent(SUPPORT_OPTIONS, values.emailSupport).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
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
                  placeholder="1"
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
