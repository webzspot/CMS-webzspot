import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  FiPlus,
  FiX,
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiLoader,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import {
  getForms,
  createForm,
  updateForm,
  deleteForm,
  publishForm,
  unpublishForm,
} from "../api/formApi";
import { createFormField } from "../api/formFieldApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import { slugify } from "../utils/slug";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyEndpoint from "../components/CopyEndpoint";
import { publicFormSubmit } from "../utils/publicApi";
import FieldRowsEditor from "../components/FieldRowsEditor";
import {
  emptyFieldRow,
  buildFieldPayloads,
} from "../utils/formFieldRows";

const inputClass =
  "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-100";

const FormDialog = ({ projectId, form, onClose, onSaved }) => {
  const isEdit = Boolean(form);
  const [values, setValues] = useState({
    name: form?.name ?? "",
    slug: form?.slug ?? "",
    description: form?.description ?? "",
  });
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [rows, setRows] = useState([emptyFieldRow()]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const setName = (name) =>
    setValues((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugify(name),
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const next = {};
    if (!values.name.trim()) next.name = "Name is required";
    if (!values.slug.trim()) next.slug = "Slug is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description.trim(),
      };
      if (isEdit) {
        const data = await updateForm(form.formId, payload);
        onSaved(data.message || "Form updated");
        return;
      }

      const data = await createForm(projectId, payload);
      const created = data.form;

      // The form exists by this point, so a failing field row is reported
      // rather than rolled back.
      const fieldPayloads = buildFieldPayloads(rows);
      const results = await Promise.allSettled(
        fieldPayloads.map((field) => createFormField(created.formId, field)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;

      onSaved(
        failed
          ? `Form created, but ${failed} field${failed === 1 ? "" : "s"} could not be added.`
          : data.message || "Form created successfully",
      );
    } catch (error) {
      if (getErrorStatus(error) === 409) {
        setErrors({ slug: "This slug is already used by another form." });
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  };

  const border = (key) =>
    errors[key]
      ? "border-red-400 focus:border-red-500"
      : "border-slate-200 focus:border-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
      <form
        onSubmit={handleSubmit}
        className={`w-full rounded-xl bg-white shadow-xl ${isEdit ? "max-w-md" : "max-w-4xl"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit form" : "New form"}
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Form name
            </label>
            <input
              value={values.name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((p) => ({ ...p, name: "", slug: "" }));
              }}
              placeholder="Contact Form"
              autoFocus
              className={`${inputClass} ${border("name")}`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
            {/* The API requires a slug, so it is derived from the name and only
                surfaced when the admin needs to change it. */}
            {errors.slug && (
              <p className="mt-1 text-xs text-red-600">{errors.slug}</p>
            )}
          </div>

          {isEdit && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Slug
                </label>
                <input
                  value={values.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setValues((p) => ({ ...p, slug: e.target.value }));
                    setErrors((p) => ({ ...p, slug: "" }));
                  }}
                  placeholder="contact-form"
                  className={`${inputClass} ${border("slug")} font-mono`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={values.description}
                  onChange={(e) =>
                    setValues((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  placeholder="Customer contact form"
                  className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`}
                />
              </div>
            </>
          )}

          {!isEdit && <FieldRowsEditor rows={rows} onChange={setRows} />}
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
              {isEdit ? "Save" : "Create form"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const FormsTab = () => {
  const { projectId, project } = useOutletContext();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [dialogFor, setDialogFor] = useState(null);
  const [deleteState, setDeleteState] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadForms = (id) =>
    getForms(id)
      .then((data) => {
        setForms(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadForms(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleSaved = (message) => {
    setDialogFor(null);
    setNotice({ type: "success", text: message });
    loadForms(projectId);
  };

  const togglePublish = async (form) => {
    const isPublished = form.status === "PUBLISHED";
    setBusyId(form.formId);
    try {
      const data = isPublished
        ? await unpublishForm(form.formId)
        : await publishForm(form.formId);
      setNotice({ type: "success", text: data.message || "Form updated" });
      loadForms(projectId);
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    const form = deleteState.form;
    setBusyId(form.formId);
    try {
      const data = await deleteForm(form.formId);
      setDeleteState(null);
      setNotice({ type: "success", text: data.message || "Form deleted" });
      loadForms(projectId);
    } catch (err) {
      setDeleteState({ form, error: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Contact, enquiry, booking forms. Submit from any static site via API.
        </p>
        <button
          onClick={() => setDialogFor({})}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <FiPlus size={16} /> New form
        </button>
      </div>

      {notice && (
        <div
          className={`mt-5 flex items-start justify-between gap-3 rounded-lg p-4 text-sm ${
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

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : forms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
            <FiFileText className="mx-auto mb-3 text-slate-300" size={32} />
            <h3 className="font-medium text-slate-800">No forms yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a form to start collecting submissions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {forms.map((form) => {
              const fieldCount = form._count?.fields ?? 0;
              const submissionCount = form._count?.submissions ?? 0;
              const isPublished = form.status === "PUBLISHED";
              const busy = busyId === form.formId;

              return (
                <div
                  key={form.formId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FiFileText
                      className="shrink-0 text-indigo-600"
                      size={18}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900">
                          {form.name}
                        </h3>
                        <StatusBadge status={form.status} />
                      </div>
                      {/* Where a website POSTs this form's submissions */}
                      <CopyEndpoint
                        endpoint={publicFormSubmit(project?.slug, form.slug)}
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        {fieldCount} field{fieldCount === 1 ? "" : "s"} ·{" "}
                        {submissionCount} submission
                        {submissionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={`/admin/projects/${projectId}/forms/${form.formId}/submissions`}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Submissions
                    </Link>
                    <Link
                      to={`/admin/projects/${projectId}/forms/${form.formId}`}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      Fields
                    </Link>
                    <button
                      onClick={() => togglePublish(form)}
                      disabled={busy || (!isPublished && fieldCount === 0)}
                      title={
                        !isPublished && fieldCount === 0
                          ? "Form must have at least one field before publishing"
                          : undefined
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? (
                        <FiLoader size={14} className="animate-spin" />
                      ) : isPublished ? (
                        <FiEyeOff size={14} />
                      ) : (
                        <FiEye size={14} />
                      )}
                      {isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => setDialogFor(form)}
                      title="Edit form"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 transition hover:bg-slate-50"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteState({ form, error: "" })}
                      title="Delete form"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dialogFor && (
        <FormDialog
          projectId={projectId}
          form={dialogFor.formId ? dialogFor : null}
          onClose={() => setDialogFor(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteState && (
        <ConfirmDialog
          title="Delete form?"
          message={`"${deleteState.form.name}" and its submissions will be permanently deleted. This cannot be undone.`}
          error={deleteState.error}
          busy={busyId === deleteState.form.formId}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default FormsTab;

