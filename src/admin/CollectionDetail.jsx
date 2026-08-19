import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiX,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiInbox,
  FiEdit2,
  FiTrash2,
  FiAlertCircle,
} from "react-icons/fi";
import {
  getCollection,
  publishCollection,
  unpublishCollection,
} from "../api/collectionApi";
import { getFields } from "../api/fieldApi";
import { getRecords, deleteRecord } from "../api/recordApi";
import { getErrorMessage } from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import RecordForm from "../components/RecordForm";
import { formatCell } from "../utils/recordFields";

const CollectionDetail = () => {
  const { projectId, collectionId } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recordsError, setRecordsError] = useState("");
  const [notice, setNotice] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [formFor, setFormFor] = useState(null); // {} = create, record = edit
  const [deleteState, setDeleteState] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadAll = (id) =>
    Promise.all([
      getCollection(id)
        .then(setCollection)
        .catch((err) => setError(getErrorMessage(err))),
      getFields(id)
        .then(setFields)
        .catch((err) => setError(getErrorMessage(err))),
      getRecords(id)
        .then((data) => {
          setRecords(data);
          setRecordsError("");
        })
        .catch((err) => setRecordsError(getErrorMessage(err))),
    ]).finally(() => setLoading(false));

  useEffect(() => {
    loadAll(collectionId);
  }, [collectionId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const isPublished = collection?.status === "PUBLISHED";

  // The backend rejects publishing a collection with no fields.
  const togglePublish = async () => {
    setPublishing(true);
    try {
      const data = isPublished
        ? await unpublishCollection(collectionId)
        : await publishCollection(collectionId);
      setNotice({ type: "success", text: data.message || "Collection updated" });
      loadAll(collectionId);
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setPublishing(false);
    }
  };

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
      setDeleteState((prev) => ({ ...prev, error: getErrorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold text-slate-900">
                  {collection?.name || "Collection"}
                </h1>
                {collection?.status && (
                  <StatusBadge status={collection.status} />
                )}
              </div>
              <p className="mt-1 truncate font-mono text-sm text-slate-400">
                /api/v1/{collection?.slug || collectionId}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <button
                onClick={togglePublish}
                disabled={publishing || (!isPublished && fields.length === 0)}
                title={
                  !isPublished && fields.length === 0
                    ? "Add at least one field before publishing"
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
                onClick={() =>
                  navigate(`/admin/projects/${projectId}/collections`)
                }
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

        {!loading && !isPublished && (
          <div className="mb-6 flex gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <span>
              This collection is a draft. Publish it before entries are served
              through the API.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Entries</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading entries..."
                : `${records.length} entr${records.length === 1 ? "y" : "ies"} in this collection`}
            </p>
          </div>
          <button
            onClick={() => setFormFor({})}
            disabled={fields.length === 0}
            title={
              fields.length === 0
                ? "This collection has no fields to fill in"
                : undefined
            }
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FiPlus size={16} /> Add entry
          </button>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          ) : recordsError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
              {recordsError}
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
              <FiInbox className="mx-auto mb-3 text-slate-300" size={32} />
              <h3 className="font-medium text-slate-800">No entries yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Add your first entry to this collection.
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
                          {formatCell(field, record.data?.[field.slug])}
                        </td>
                      ))}
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setFormFor(record)}
                            title="Edit entry"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteState({ record, error: "" })}
                            title="Delete entry"
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
        </div>
      </div>

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
          title="Delete entry?"
          message="Are you sure you want to delete this entry? This action cannot be undone."
          error={deleteState.error}
          busy={busy}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default CollectionDetail;
