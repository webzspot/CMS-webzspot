import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiX,
  FiInbox,
  FiEdit2,
  FiTrash2,
  FiAlertCircle,
} from "react-icons/fi";
import PageShell from "../components/PageShell";
import ConfirmDialog from "../components/ConfirmDialog";
import RecordForm from "../components/RecordForm";
import RecordCell from "../components/RecordCell";
import { getCollection } from "../api/collectionApi";
import { getFields } from "../api/fieldApi";
import { getRecords, deleteRecord } from "../api/recordApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";

// 403 from these routes means the backend refused access, which is the
// authority. Never work around it in the UI.
const accessMessage = (err, fallback) =>
  getErrorStatus(err) === 403
    ? getErrorMessage(err) || "You do not have access to this collection."
    : getErrorMessage(err) || fallback;

const CollectionRecords = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [formFor, setFormFor] = useState(null);
  const [deleteState, setDeleteState] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadAll = (id) =>
    Promise.all([
      getCollection(id)
        .then(setCollection)
        .catch(() => setCollection(null)),
      getFields(id)
        .then(setFields)
        .catch(() => setFields([])),
      getRecords(id)
        .then((data) => {
          setRecords(data);
          setError("");
        })
        .catch((err) => setError(accessMessage(err, "Could not load records"))),
    ]).finally(() => setLoading(false));

  useEffect(() => {
    loadAll(collectionId);
  }, [collectionId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // The backend only allows writes on a published collection.
  const isPublished = collection?.status === "PUBLISHED";
  const canWrite = isPublished && fields.length > 0;

  const handleSaved = (message) => {
    setFormFor(null);
    setNotice({ type: "success", text: message });
    loadAll(collectionId);
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const data = await deleteRecord(deleteState.record.recordId);
      setDeleteState(null);
      setNotice({ type: "success", text: data.message || "Record deleted" });
      loadAll(collectionId);
    } catch (err) {
      setDeleteState((prev) => ({
        ...prev,
        error: accessMessage(err, "Could not delete this record"),
      }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title={collection?.name || "Records"}
      subtitle={
        loading
          ? "Loading records..."
          : `${records.length} record${records.length === 1 ? "" : "s"}`
      }
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            <FiArrowLeft size={16} /> Back
          </button>
          <button
            onClick={() => setFormFor({})}
            disabled={!canWrite}
            title={
              !isPublished
                ? "This collection is not published yet"
                : fields.length === 0
                  ? "This collection has no fields"
                  : undefined
            }
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FiPlus size={16} /> Add record
          </button>
        </div>
      }
    >
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

      {!loading && collection && !isPublished && (
        <div className="mb-6 flex gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          <FiAlertCircle className="mt-0.5 shrink-0" />
          <span>
            This collection is not published, so records cannot be added or
            changed yet.
          </span>
        </div>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
          <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => navigate("/user/dashboard")}
            className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Back to my projects
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <FiInbox className="mx-auto mb-3 text-slate-300" size={32} />
          <h3 className="font-medium text-slate-800">No records yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add the first record to this collection.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {fields.map((field) => (
                  <th
                    key={field.fieldId}
                    className="px-5 py-3 font-medium text-slate-500"
                  >
                    {field.name}
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.recordId}
                  className="border-b border-slate-50 last:border-0"
                >
                  {fields.map((field) => (
                    <td
                      key={field.fieldId}
                      className="max-w-xs truncate px-5 py-3 text-slate-800"
                    >
                      <RecordCell field={field} record={record} />
                    </td>
                  ))}
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setFormFor(record)}
                        disabled={!canWrite}
                        title="Edit record"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteState({ record, error: "" })}
                        disabled={!isPublished}
                        title="Delete record"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
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

      {formFor && (
        <RecordForm
          collectionId={collectionId}
          fields={fields}
          record={formFor.recordId ? formFor : null}
          onClose={() => setFormFor(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteState && (
        <ConfirmDialog
          title="Delete record?"
          message="Are you sure you want to delete this record? This action cannot be undone."
          error={deleteState.error}
          busy={busy}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </PageShell>
  );
};

export default CollectionRecords;
