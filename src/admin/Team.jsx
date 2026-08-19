import { useEffect, useState } from "react";
import {
  FiPlus,
  FiX,
  FiUsers,
  FiEdit2,
  FiTrash2,
  FiLoader,
  FiFolder,
  FiRefreshCw,
} from "react-icons/fi";
import PageShell from "../components/PageShell";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  getClientUsers,
  createClientUser,
  updateClientUser,
  deleteClientUser,
  getUserProjects,
  assignProjectToUser,
  removeProjectAccess,
} from "../api/clientUserApi";
import { getProjects } from "../api/projectApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import { useAuth } from "../auth/authContext";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const UserForm = ({ user, projects, onClose, onSaved }) => {
  const isEdit = Boolean(user);
  const [values, setValues] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    projectId: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const setValue = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = "Name is required";
    if (!values.email.trim()) next.email = "Email is required";
    if (!isEdit) {
      if (!values.password) next.password = "Password is required";
      if (!values.projectId) next.projectId = "Select a project";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    setSaving(true);
    try {
      let data;
      if (isEdit) {
        // Only send what changed, and never an empty password
        const payload = {};
        if (values.name.trim() !== user.name) payload.name = values.name.trim();
        if (values.email.trim() !== user.email)
          payload.email = values.email.trim();
        if (values.password) payload.password = values.password;

        if (Object.keys(payload).length === 0) {
          setFormError("Nothing changed yet.");
          setSaving(false);
          return;
        }
        data = await updateClientUser(user.userId, payload);
      } else {
        data = await createClientUser({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          projectId: values.projectId,
        });
      }
      onSaved(data.message || "User saved");
    } catch (error) {
      if (getErrorStatus(error) === 409) {
        setErrors((prev) => ({
          ...prev,
          email: "A user with this email already exists.",
        }));
      } else {
        setFormError(getErrorMessage(error));
      }
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
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit user" : "New user"}
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
              Name
            </label>
            <input
              value={values.name}
              onChange={(e) => setValue("name", e.target.value)}
              placeholder="John Doe"
              autoFocus
              className={inputClass}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={values.email}
              onChange={(e) => setValue("email", e.target.value)}
              placeholder="john@example.com"
              className={inputClass}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
              {isEdit && (
                <span className="ml-1 font-normal text-slate-400">
                  (leave blank to keep current)
                </span>
              )}
            </label>
            <input
              type="password"
              value={values.password}
              onChange={(e) => setValue("password", e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          {!isEdit && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Project
              </label>
              <select
                value={values.projectId}
                onChange={(e) => setValue("projectId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="mt-1 text-xs text-red-600">{errors.projectId}</p>
              )}
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
              {isEdit ? "Save" : "Create user"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const ManageProjectsDialog = ({ user, projects, onClose, onChanged }) => {
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toAssign, setToAssign] = useState("");

  const load = (userId) =>
    getUserProjects(userId)
      .then((data) => {
        setAssigned(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load(user.userId);
  }, [user.userId]);

  const assignedIds = new Set(assigned.map((p) => p.projectId));
  const available = projects.filter((p) => !assignedIds.has(p.projectId));

  const handleAssign = async () => {
    if (!toAssign) return;
    setBusyId(toAssign);
    try {
      await assignProjectToUser(user.userId, toAssign);
      setToAssign("");
      load(user.userId);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (projectId) => {
    setBusyId(projectId);
    try {
      await removeProjectAccess(user.userId, projectId);
      load(user.userId);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Project access
            </h2>
            <p className="text-sm text-slate-500">{user.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <div className="h-24 animate-pulse rounded-lg border border-slate-200" />
          ) : assigned.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              This user has no project access yet.
            </p>
          ) : (
            <div className="space-y-2">
              {assigned.map((project) => (
                <div
                  key={project.projectId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FiFolder className="shrink-0 text-indigo-600" size={15} />
                    <span className="truncate text-sm text-slate-800">
                      {project.project.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(project.project.projectId)}
                    disabled={busyId === project.projectId}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {busyId === project.projectId && (
                      <FiLoader size={12} className="animate-spin" />
                    )}
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <select
              value={toAssign}
              onChange={(e) => setToAssign(e.target.value)}
              className={inputClass}
            >
              <option value="">Add project access...</option>
              {available.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!toAssign || busyId === toAssign}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {busyId === toAssign ? (
                <FiLoader size={15} className="animate-spin" />
              ) : (
                <FiPlus size={15} />
              )}
              Assign
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const Team = () => {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [formFor, setFormFor] = useState(null); // {} = create, user = edit
  const [manageFor, setManageFor] = useState(null);
  const [deleteState, setDeleteState] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadAll = () =>
    Promise.all([
      getClientUsers()
        .then((data) => {
          setUsers(data);
          setError("");
        })
        .catch((err) => setError(getErrorMessage(err))),
      getProjects()
        .then(setProjects)
        .catch(() => setProjects([])),
    ]).finally(() => setLoading(false));

  useEffect(() => {
    loadAll(admin?.tenantId);
  }, [admin?.tenantId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const refresh = () => {
    setLoading(true);
    loadAll(admin?.tenantId);
  };

  const handleSaved = (message) => {
    setFormFor(null);
    setNotice({ type: "success", text: message });
    loadAll(admin?.tenantId);
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const data = await deleteClientUser(deleteState.user.userId);
      setDeleteState(null);
      setNotice({ type: "success", text: data.message || "User deleted" });
      loadAll(admin?.tenantId);
    } catch (err) {
      setDeleteState((prev) => ({ ...prev, error: getErrorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Team"
      subtitle={
        loading
          ? "Loading users..."
          : `${users.length} client user${users.length === 1 ? "" : "s"}`
      }
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            title="Refresh"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setFormFor({})}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <FiPlus size={16} /> New user
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
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <FiUsers className="mx-auto mb-3 text-slate-300" size={32} />
          <h3 className="font-medium text-slate-800">No client users yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create a user and give them access to a project.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.userId}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {(user.name || "?")
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">
                    {user.name}
                  </h3>
                  <p className="truncate text-sm text-slate-500">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setManageFor(user)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <FiFolder size={14} /> Projects
                </button>
                <button
                  onClick={() => setFormFor(user)}
                  title="Edit user"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 transition hover:bg-slate-50"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteState({ user, error: "" })}
                  title="Delete user"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formFor && (
        <UserForm
          user={formFor.userId ? formFor : null}
          projects={projects}
          onClose={() => setFormFor(null)}
          onSaved={handleSaved}
        />
      )}

      {manageFor && (
        <ManageProjectsDialog
          user={manageFor}
          projects={projects}
          onClose={() => setManageFor(null)}
          onChanged={() => loadAll(admin?.tenantId)}
        />
      )}

      {deleteState && (
        <ConfirmDialog
          title="Delete user?"
          message={`"${deleteState.user.name}" will lose access to all projects. This cannot be undone.`}
          error={deleteState.error}
          busy={busy}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </PageShell>
  );
};

export default Team;
