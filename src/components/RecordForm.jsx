import { useState } from "react";
import { FiX, FiLoader } from "react-icons/fi";
import { createRecord, updateRecord } from "../api/recordApi";
import { getErrorMessage } from "../api/axios";
import { buildData, toFormValues, validateRecord } from "../utils/recordFields";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

// Inputs are generated from the collection's field definitions, never
// hardcoded. Used by both the admin and user portals.
const RecordForm = ({ collectionId, fields, record, onClose, onSaved }) => {
  const isEdit = Boolean(record);
  const [values, setValues] = useState(() => toFormValues(fields, record));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const setValue = (slug, value) => {
    setValues((prev) => ({ ...prev, [slug]: value }));
    setErrors((prev) => ({ ...prev, [slug]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const nextErrors = validateRecord(fields, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const data = buildData(fields, values);
      const result = isEdit
        ? await updateRecord(record.recordId, data)
        : await createRecord(collectionId, data);
      onSaved(result.message || "Record saved");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (field) => {
    const value = values[field.slug];
    const onChange = (e) => setValue(field.slug, e.target.value);

    if (field.type === "BOOLEAN") {
      return (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setValue(field.slug, e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
          />
          {value ? "true" : "false"}
        </label>
      );
    }
    if (field.type === "RICHTEXT" || field.type === "JSON") {
      return (
        <textarea
          value={value}
          onChange={onChange}
          rows={field.type === "JSON" ? 4 : 5}
          placeholder={field.type === "JSON" ? '{ "key": "value" }' : ""}
          className={`${inputClass} resize-none ${field.type === "JSON" ? "font-mono" : ""}`}
        />
      );
    }
    return (
      <input
        type={
          field.type === "NUMBER"
            ? "number"
            : field.type === "DATE"
              ? "date"
              : "text"
        }
        value={value}
        onChange={onChange}
        className={inputClass}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit entry" : "New entry"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {fields.map((field) => (
            <div key={field.fieldId}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {field.name}
                {field.isRequired && (
                  <span className="ml-1 text-indigo-600">*</span>
                )}
                <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                  {field.type.toLowerCase()}
                </span>
              </label>
              {renderInput(field)}
              {errors[field.slug] && (
                <p className="mt-1 text-xs text-red-600">{errors[field.slug]}</p>
              )}
            </div>
          ))}
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
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RecordForm;
