import { useEffect, useState } from "react";
import { FiX, FiTrash2, FiInbox, FiEye, FiAlertCircle } from "react-icons/fi";
import { getFormFields } from "../api/formFieldApi";
import { getSubmissions, deleteSubmission } from "../api/submissionApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import ConfirmDialog from "./ConfirmDialog";

const formatValue = (value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const formatWhen = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// Used when the field list is not fetched: column keys come straight from the
// submissions.
const columnsFromSubmissions = (submissions) => {
  const keys = [];
  submissions.forEach((submission) => {
    Object.keys(submission.data || {}).forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });
  });
  return keys.map((key) => ({ fieldId: key, name: key, label: key }));
};

const SubmissionDialog = ({ submission, fields, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Submission</h2>
          <p className="text-sm text-slate-500">
            {formatWhen(submission.createdAt)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <FiX size={18} />
        </button>
      </div>

      <dl className="space-y-4 px-6 py-5">
        {fields.map((field) => (
          <div key={field.fieldId}>
            <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">
              {field.label}
            </dt>
            <dd className="mt-1 text-sm break-words text-slate-800">
              {formatValue(submission.data?.[field.name])}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex justify-end border-t border-slate-200 px-6 py-4">
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

// Shared by the admin and user portals. Both call the same submission
// endpoints; the backend decides access from the cookie and the user's project
// assignment.
//
// withFieldLabels fetches the form's field definitions to title the columns.
// That route is ADMIN-only, so the user portal leaves it off and the columns
// are taken from the submission data instead.
const SubmissionsPanel = ({ formId, withFieldLabels = false, onCountChange }) => {
  const [fields, setFields] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewing, setViewing] = useState(null);
  const [deleteState, setDeleteState] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadAll = (id, report, wantFields) =>
    Promise.all([
      wantFields
        ? getFormFields(id)
            .then(setFields)
            .catch(() => setFields([]))
        : Promise.resolve(),
      getSubmissions(id)
        .then((data) => {
          setSubmissions(data);
          setError("");
          report?.(data.length);
        })
        .catch((err) =>
          setError(
            getErrorStatus(err) === 403
              ? "You do not have access to this form's submissions."
              : getErrorMessage(err),
          ),
        ),
    ]).finally(() => setLoading(false));

  useEffect(() => {
    loadAll(formId, onCountChange, withFieldLabels);
  }, [formId, onCountChange, withFieldLabels]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleDelete = async () => {
    setBusy(true);
    try {
      const data = await deleteSubmission(deleteState.submission.submissionId);
      setDeleteState(null);
      setNotice(data.message || "Submission deleted successfully");
      loadAll(formId, onCountChange, withFieldLabels);
    } catch (err) {
      setDeleteState((prev) => ({
        ...prev,
        error:
          getErrorStatus(err) === 403
            ? "You do not have permission to delete this submission."
            : getErrorMessage(err),
      }));
    } finally {
      setBusy(false);
    }
  };

  const allFields = fields.length ? fields : columnsFromSubmissions(submissions);
  const columns = allFields.slice(0, 4);

  return (
    <div>
      {notice && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}>
            <FiX size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
          <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <FiInbox className="mx-auto mb-3 text-slate-300" size={32} />
          <h3 className="font-medium text-slate-800">No submissions yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Responses will appear here once people fill in this form.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 font-medium text-slate-500">
                  Submitted
                </th>
                {columns.map((field) => (
                  <th
                    key={field.fieldId}
                    className="px-5 py-3 font-medium text-slate-500"
                  >
                    {field.label}
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr
                  key={submission.submissionId}
                  className="border-b border-slate-50 last:border-0"
                >
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                    {formatWhen(submission.createdAt)}
                  </td>
                  {columns.map((field) => (
                    <td
                      key={field.fieldId}
                      className="max-w-xs truncate px-5 py-3 text-slate-800"
                    >
                      {formatValue(submission.data?.[field.name])}
                    </td>
                  ))}
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setViewing(submission)}
                        title="View submission"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50"
                      >
                        <FiEye size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteState({ submission, error: "" })}
                        title="Delete submission"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <SubmissionDialog
          submission={viewing}
          fields={allFields}
          onClose={() => setViewing(null)}
        />
      )}

      {deleteState && (
        <ConfirmDialog
          title="Delete submission?"
          message="This response will be permanently deleted and the form's submission count will go down by one."
          error={deleteState.error}
          busy={busy}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default SubmissionsPanel;
