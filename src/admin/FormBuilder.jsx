import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiX,
  FiEdit2,
  FiTrash2,
  FiLoader,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiLock,
} from "react-icons/fi";
import { getForm, publishForm, unpublishForm } from "../api/formApi";
import {
  getFormFields,
  createFormField,
  updateFormField,
  deleteFormField,
} from "../api/formFieldApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import FieldRowsEditor from "../components/FieldRowsEditor";
import {
  emptyFieldRow,
  fieldToRow,
  buildFieldPayloads,
} from "../utils/formFieldRows";

// Adding and editing share the same row design. Editing just starts from the
// saved field and writes back to that one field.
const FieldsDialog = ({ formId, field, startOrder, onClose, onSaved }) => {
  const isEdit = Boolean(field);
  const [rows, setRows] = useState(() =>
    isEdit ? [fieldToRow(field)] : [emptyFieldRow()],
  );
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const payloads = buildFieldPayloads(rows);
    if (payloads.length === 0) {
      setFormError(isEdit ? "A label is required." : "Add at least one field.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        // Keep the field where it already sits in the order
        const data = await updateFormField(field.fieldId, {
          ...payloads[0],
          displayOrder: field.displayOrder,
        });
        onSaved(data.message || "Field updated");
        return;
      }

      const results = await Promise.allSettled(
        payloads.map((row, index) =>
          createFormField(formId, {
            ...row,
            displayOrder: startOrder + index,
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === payloads.length) {
        setFormError(getErrorMessage(failed[0].reason));
        return;
      }
      onSaved(
        failed.length
          ? `Added ${payloads.length - failed.length} field(s), ${failed.length} failed.`
          : `Added ${payloads.length} field${payloads.length === 1 ? "" : "s"}`,
      );
    } catch (err) {
      setFormError(
        getErrorStatus(err) === 409
          ? "A field with this name already exists."
          : getErrorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit field" : "Add fields"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <FieldRowsEditor rows={rows} onChange={setRows} />
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

const FormBuilder = () => {
  const { projectId, formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [dialogFor, setDialogFor] = useState(null); // edit an existing field
  const [addOpen, setAddOpen] = useState(false); // add new rows
  const [deleteState, setDeleteState] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadAll = (id) =>
    Promise.all([
      getForm(id)
        .then(setForm)
        .catch((err) => setError(getErrorMessage(err))),
      getFormFields(id)
        .then(setFields)
        .catch((err) => setError(getErrorMessage(err))),
    ]).finally(() => setLoading(false));

  useEffect(() => {
    loadAll(formId);
  }, [formId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const isPublished = form?.status === "PUBLISHED";

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const data = isPublished
        ? await unpublishForm(formId)
        : await publishForm(formId);
      setNotice({ type: "success", text: data.message || "Form updated" });
      loadAll(formId);
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setPublishing(false);
    }
  };

  const handleSaved = (message) => {
    setDialogFor(null);
    setNotice({ type: "success", text: message });
    loadAll(formId);
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const data = await deleteFormField(deleteState.field.fieldId);
      setDeleteState(null);
      setNotice({ type: "success", text: data.message || "Field deleted" });
      loadAll(formId);
    } catch (err) {
      setDeleteState((prev) => ({ ...prev, error: getErrorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  const nextOrder = fields.length
    ? Math.max(...fields.map((f) => f.displayOrder ?? 0)) + 1
    : 1;

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold text-slate-900">
                  {form?.name || "Form"}
                </h1>
                {form?.status && <StatusBadge status={form.status} />}
              </div>
              <p className="mt-1 truncate font-mono text-sm text-slate-400">
                {form?.slug || formId}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <button
                onClick={togglePublish}
                disabled={publishing || (!isPublished && fields.length === 0)}
                title={
                  !isPublished && fields.length === 0
                    ? "Form must have at least one field before publishing"
                    : undefined
                }
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {publishing ? (
                  <FiLoader size={15} className="animate-spin" />
                ) : isPublished ? (
                  <FiEyeOff size={15} />
                ) : (
                  <FiEye size={15} />
                )}
                {isPublished ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={() => navigate(`/admin/projects/${projectId}/forms`)}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
              >
                <FiArrowLeft size={16} /> Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
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

        {/* Published forms are locked: the backend rejects field changes */}
        {!loading && isPublished && (
          <div className="mb-6 flex gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            <FiLock className="mt-0.5 shrink-0" />
            <span>
              This form is published, so its fields cannot be changed. Unpublish
              it first to edit them.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Fields</h2>
            <p className="mt-1 text-sm text-slate-500">
              What people fill in when they submit this form.
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            disabled={isPublished}
            title={isPublished ? "Unpublish the form to add fields" : undefined}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FiPlus size={16} /> Add field
          </button>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          ) : fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
              <FiAlertCircle className="mx-auto mb-3 text-slate-300" size={28} />
              <h3 className="font-medium text-slate-800">No fields yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Add at least one field before publishing this form.
              </p>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
              {fields.map((field) => (
                <div
                  key={field.fieldId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-indigo-600">*</span>
                      )}
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                        {field.type.toLowerCase()}
                      </span>
                    </div>
                    <p className="truncate font-mono text-xs text-slate-400">
                      {field.name}
                      {field.options?.length
                        ? ` Â· ${field.options.length} options`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setDialogFor(field)}
                      disabled={isPublished}
                      title="Edit field"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteState({ field, error: "" })}
                      disabled={isPublished}
                      title="Delete field"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {addOpen && (
        <FieldsDialog
          formId={formId}
          startOrder={nextOrder}
          onClose={() => setAddOpen(false)}
          onSaved={(message) => {
            setAddOpen(false);
            handleSaved(message);
          }}
        />
      )}

      {dialogFor && (
        <FieldsDialog
          formId={formId}
          field={dialogFor}
          startOrder={nextOrder}
          onClose={() => setDialogFor(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteState && (
        <ConfirmDialog
          title="Delete field?"
          message={`"${deleteState.field.label}" will be permanently removed from this form.`}
          error={deleteState.error}
          busy={busy}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default FormBuilder;

