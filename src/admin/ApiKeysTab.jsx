import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  FiPlus,
  FiX,
  FiKey,
  FiTrash2,
  FiLoader,
  FiCopy,
  FiCheck,
  FiSlash,
  FiRotateCcw,
  FiAlertTriangle,
} from "react-icons/fi";
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  activateApiKey,
  deleteApiKey,
} from "../api/apiKeyApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import { formatDate } from "../utils/planFormat";
import ConfirmDialog from "../components/ConfirmDialog";

// The backend owns subscription and plan limits, so its wording is kept except
// for these two, which read better in plain language.
const friendlyError = (error) => {
  const message = getErrorMessage(error);
  if (/active subscription required/i.test(message)) {
    return "Your subscription is inactive. Activate a plan to create API keys.";
  }
  if (/api key limit reached/i.test(message)) {
    return "You have reached your API key limit. Upgrade your plan to create another.";
  }
  return message;
};

// Shown once, immediately after creation. The raw key cannot be fetched again.
const NewKeyDialog = ({ apiKey, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">
          Copy your API key
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {apiKey.name}
        </p>

        <div className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <span>
            This is the only time the full key is shown. Once you close this
            dialog it cannot be retrieved again.
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 font-mono text-sm text-slate-800">
            {apiKey.key}
          </code>
          <button
            onClick={copy}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            I've saved it
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateKeyDialog = ({ projectId, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setNameError("API key name is required");
      return;
    }

    setSaving(true);
    try {
      const data = await createApiKey(projectId, name.trim());
      onCreated(data.apiKey, data.message);
    } catch (error) {
      setFormError(friendlyError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">New API key</h2>
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
            Name
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            placeholder="Production API Key"
            autoFocus
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-100 ${
              nameError
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-indigo-500"
            }`}
          />
          {nameError ? (
            <p className="mt-1 text-xs text-red-600">{nameError}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              The full key is shown once, right after it is created.
            </p>
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
              Create
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const ApiKeysTab = () => {
  const { projectId } = useOutletContext();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [confirm, setConfirm] = useState(null); // { key, mode: revoke|delete }
  const [busyId, setBusyId] = useState(null);

  const loadKeys = (id) =>
    getApiKeys(id)
      .then((data) => {
        setApiKeys(data);
        setError("");
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadKeys(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleCreated = (apiKey, message) => {
    setCreateOpen(false);
    setNewKey(apiKey); // held in state only, never persisted or logged
    setNotice({ type: "success", text: message || "API key created" });
    loadKeys(projectId);
  };

  const handleActivate = async (key) => {
    setBusyId(key.apiKeyId);
    try {
      const data = await activateApiKey(key.apiKeyId);
      setNotice({ type: "success", text: data.message || "API key activated" });
      loadKeys(projectId);
    } catch (err) {
      // 400 "already active" just means our list is stale
      setNotice({ type: "error", text: getErrorMessage(err) });
      if (getErrorStatus(err) === 400) loadKeys(projectId);
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirm = async () => {
    const { key, mode } = confirm;
    setBusyId(key.apiKeyId);
    try {
      const data =
        mode === "delete"
          ? await deleteApiKey(key.apiKeyId)
          : await revokeApiKey(key.apiKeyId);
      setConfirm(null);
      setNotice({ type: "success", text: data.message || "API key updated" });
      loadKeys(projectId);
    } catch (err) {
      setConfirm((prev) => ({ ...prev, error: getErrorMessage(err) }));
      if (getErrorStatus(err) === 400) loadKeys(projectId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Keys your applications use to read this project's published content.
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <FiPlus size={16} /> New API key
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
        ) : apiKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
            <FiKey className="mx-auto mb-3 text-slate-300" size={32} />
            <h3 className="font-medium text-slate-800">No API keys yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create one to let an application read this project.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => {
              const busy = busyId === key.apiKeyId;

              return (
                <div
                  key={key.apiKeyId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FiKey
                      className={`shrink-0 ${key.isActive ? "text-indigo-600" : "text-slate-400"}`}
                      size={18}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-900">
                          {key.name}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            key.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {key.isActive ? "Active" : "Revoked"}
                        </span>
                      </div>
                      <p className="truncate font-mono text-xs text-slate-500">
                        {key.keyPrefix}…
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Created {formatDate(key.createdAt)} · Last used{" "}
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : "never"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {key.isActive ? (
                      <button
                        onClick={() => setConfirm({ key, mode: "revoke" })}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiSlash size={14} /> Revoke
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(key)}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busy ? (
                          <FiLoader size={14} className="animate-spin" />
                        ) : (
                          <FiRotateCcw size={14} />
                        )}
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => setConfirm({ key, mode: "delete" })}
                      title="Delete API key"
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

      {createOpen && (
        <CreateKeyDialog
          projectId={projectId}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {newKey && (
        <NewKeyDialog apiKey={newKey} onClose={() => setNewKey(null)} />
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.mode === "delete" ? "Delete API key?" : "Revoke API key?"
          }
          message={
            confirm.mode === "delete"
              ? `"${confirm.key.name}" will be permanently deleted. Any application using it will stop working immediately, and this cannot be undone.`
              : `"${confirm.key.name}" will stop working until you activate it again.`
          }
          confirmLabel={confirm.mode === "delete" ? "Delete" : "Revoke"}
          error={confirm.error}
          busy={busyId === confirm.key.apiKeyId}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default ApiKeysTab;
