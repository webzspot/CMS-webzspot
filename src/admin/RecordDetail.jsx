import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { getCollection } from "../api/collectionApi";
import { getFields } from "../api/fieldApi";
import { getRecord, deleteRecord } from "../api/recordApi";
import { getProject } from "../api/projectApi";
import { getErrorMessage } from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import RecordForm from "../components/RecordForm";
import RecordCell from "../components/RecordCell";
import CopyEndpoint from "../components/CopyEndpoint";
import { publicRecord } from "../utils/publicApi";

const RecordDetail = () => {
  const { projectId, collectionId, recordId } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [project, setProject] = useState(null);
  const [fields, setFields] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadAll = () =>
    Promise.all([
      getCollection(collectionId)
        .then(setCollection)
        .catch(() => setCollection(null)),
      getFields(collectionId)
        .then(setFields)
        .catch(() => setFields([])),
      getRecord(recordId)
        .then((data) => {
          setRecord(data);
          setError("");
        })
        .catch((err) => setError(getErrorMessage(err))),
      getProject(projectId)
        .then(setProject)
        .catch(() => setProject(null)),
    ]).finally(() => setLoading(false));

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, recordId, projectId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const backToCollection = () =>
    navigate(`/admin/projects/${projectId}/collections/${collectionId}`);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteRecord(recordId);
      backToCollection();
    } catch (err) {
      setConfirming(false);
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const endpoint = publicRecord(project?.slug, collection?.slug, recordId);

  return (
    <div>
      {/* Same header as the collection page, with the record id appended */}
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
              <div className="mt-1">
                <CopyEndpoint endpoint={endpoint} size="sm" />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <button
                onClick={() => setEditing(true)}
                disabled={!record}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <FiEdit2 size={15} /> Edit
              </button>
              <button
                onClick={() => setConfirming(true)}
                disabled={!record}
                title="Delete entry"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <FiTrash2 size={15} />
              </button>
              <button
                onClick={backToCollection}
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

        {loading ? (
          <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Entry</h2>
              <p className="mt-1 text-sm text-slate-500">
                Every field in this entry.
              </p>
            </div>
            <dl className="divide-y divide-slate-50">
              {fields.map((field) => (
                <div
                  key={field.fieldId}
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[200px_1fr] sm:gap-6"
                >
                  <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                    {field.name}
                    {field.isRequired && (
                      <span className="ml-1 text-indigo-600">*</span>
                    )}
                  </dt>
                  <dd className="min-w-0 text-sm break-words text-slate-800">
                    <RecordCell field={field} record={record} size="detail" />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {editing && record && (
        <RecordForm
          collectionId={collectionId}
          fields={fields}
          record={record}
          onClose={() => setEditing(false)}
          onSaved={(message) => {
            setEditing(false);
            setNotice({ type: "success", text: message });
            loadAll();
          }}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete entry?"
          message="Are you sure you want to delete this entry? This action cannot be undone."
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default RecordDetail;
