import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  FiPlus,
  FiTrash2,
  FiX,
  FiDatabase,
  FiLoader,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import {
  getCollections,
  deleteCollection,
  createCollection,
  updateCollection,
} from "../api/collectionApi";
import { createField, FIELD_TYPES } from "../api/fieldApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import { useAuth } from "../auth/authContext";
import ConfirmDialog from "../components/ConfirmDialog";
import CopyEndpoint from "../components/CopyEndpoint";
import { publicCollection } from "../utils/publicApi";

const emptyRow = () => ({ name: "", type: "TEXT", isRequired: false });

// Name and fields are captured together, then sent as one create collection
// call followed by one create field call per row. The backend generates every
// slug, so none are sent.
const CollectionForm = ({
  projectId,
  tenantId,
  collection,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(collection);
  const [name, setName] = useState(collection?.name ?? "");
  const [rows, setRows] = useState([emptyRow()]);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const setRow = (index, key, value) =>
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  // Row order is the field order: displayOrder is assigned from the row's
  // position when the fields are created.
  const moveRow = (index, direction) =>
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setNameError("Collection name is required");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const data = await updateCollection(collection.collectionId, {
          name: name.trim(),
        });
        onSaved(data.message || "Collection updated", data.collection);
        return;
      }

      const data = await createCollection(projectId, tenantId, {
        name: name.trim(),
      });
      const created = data.collection;

      // Fields are added one by one; the collection already exists by now, so
      // a failing row is reported rather than rolled back.
      const filled = rows.filter((row) => row.name.trim());
      const results = await Promise.allSettled(
        filled.map((row, index) =>
          createField(created.collectionId, tenantId, {
            name: row.name.trim(),
            type: row.type,
            isRequired: row.isRequired,
            displayOrder: index + 1,
          }),
        ),
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      const message = failed
        ? `Collection created, but ${failed} field${failed === 1 ? "" : "s"} could not be added.`
        : data.message || "Collection created successfully";

      onSaved(message, created, { fieldsAdded: filled.length - failed });
    } catch (error) {
      if (getErrorStatus(error) === 409) {
        setNameError("A collection with this name already exists.");
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  };

  // No width here on purpose: each element sets its own, and a w-full in this
  // shared string would override them.
  const inputClass =
    "rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit collection" : "New collection"}
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
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Name <span className="text-slate-400">(e.g. Blogs, Products)</span>
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            autoFocus
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-100 ${
              nameError
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-indigo-500"
            }`}
          />
          {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}

          {!isEdit && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Fields</h3>
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                >
                  <FiPlus size={15} /> Add field
                </button>
              </div>

              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={row.name}
                      onChange={(e) => setRow(index, "name", e.target.value)}
                      placeholder="field_name"
                      className={`${inputClass} min-w-0 flex-1 font-mono`}
                    />
                    <select
                      value={row.type}
                      onChange={(e) => setRow(index, "type", e.target.value)}
                      className={`${inputClass} w-32 shrink-0`}
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.value.toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <label className="flex shrink-0 items-center gap-1.5 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={row.isRequired}
                        onChange={(e) =>
                          setRow(index, "isRequired", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                      />
                      req
                    </label>
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => moveRow(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                        className="rounded px-1 text-slate-400 transition hover:text-indigo-600 disabled:opacity-25 disabled:hover:text-slate-400"
                      >
                        <FiChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRow(index, 1)}
                        disabled={index === rows.length - 1}
                        title="Move down"
                        className="rounded px-1 text-slate-400 transition hover:text-indigo-600 disabled:opacity-25 disabled:hover:text-slate-400"
                      >
                        <FiChevronDown size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={rows.length === 1}
                      title="Remove field"
                      className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Leave a row blank to skip it.
              </p>
            </div>
          )}
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

const CollectionsTab = () => {
  const { projectId, project } = useOutletContext();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [formFor, setFormFor] = useState(null); // {} = create, collection = edit
  const [deleteState, setDeleteState] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadCollections = (id) =>
    getCollections(id)
      .then((data) => {
        setCollections(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadCollections(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // After creating, go straight to the new collection to add its fields
  const handleSaved = (message, collection, meta) => {
    const wasCreate = !formFor?.collectionId;
    setFormFor(null);
    if (wasCreate && collection?.collectionId) {
      // Into the new collection. If no fields came through with the form, open
      // the field dialog there so the schema still gets defined.
      navigate(
        `/admin/projects/${projectId}/collections/${collection.collectionId}`,
        { state: { addField: !meta?.fieldsAdded, notice: message } },
      );
      return;
    }
    setNotice({ type: "success", text: message });
    loadCollections(projectId);
  };

  const handleDelete = async () => {
    const collection = deleteState.collection;
    setBusyId(collection.collectionId);
    try {
      const data = await deleteCollection(collection.collectionId);
      setDeleteState(null);
      setNotice({ type: "success", text: data.message || "Collection deleted" });
      loadCollections(projectId);
    } catch (err) {
      setDeleteState({ collection, error: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Define custom schemas. Blogs, products, testimonials — anything your
          website needs.
        </p>
        <button
          onClick={() => setFormFor({})}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <FiPlus size={16} /> New collection
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
        ) : collections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
            <p className="text-sm text-slate-500">
              No collections yet. Create one to define your first schema.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => {
              const fieldCount = collection.fields?.length ?? 0;
              const to = `/admin/projects/${projectId}/collections/${collection.collectionId}`;

              return (
                <div
                  key={collection.collectionId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:border-slate-300"
                >
                  <Link to={to} className="flex min-w-0 items-center gap-3">
                    <FiDatabase
                      className="shrink-0 text-indigo-600"
                      size={18}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">
                        {collection.name}
                      </h3>
                      <CopyEndpoint
                        endpoint={publicCollection(
                          project?.slug,
                          collection.slug,
                        )}
                      />
                      <p className="mt-0.5 text-xs text-slate-400">
                        {fieldCount} field{fieldCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={to}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => setDeleteState({ collection, error: "" })}
                      title="Delete collection"
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

      {formFor && (
        <CollectionForm
          projectId={projectId}
          tenantId={user?.tenantId}
          collection={formFor.collectionId ? formFor : null}
          onClose={() => setFormFor(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteState && (
        <ConfirmDialog
          title="Delete collection?"
          message={`Are you sure you want to delete "${deleteState.collection.name}"? This action cannot be undone.`}
          error={deleteState.error}
          busy={busyId === deleteState.collection.collectionId}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default CollectionsTab;
