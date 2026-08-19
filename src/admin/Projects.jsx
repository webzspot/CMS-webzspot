import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiFolder,
  FiAlertCircle,
  FiRefreshCw,
  FiChevronRight,
  FiPlus,
  FiX,
  FiEdit2,
  FiTrash2,
  FiLoader,
} from "react-icons/fi";
import PageShell from "../components/PageShell";
import {
  getProjects,
  deleteProject,
  createProject,
  updateProject,
} from "../api/projectApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import ConfirmDialog from "../components/ConfirmDialog";

// The backend owns project limits and subscription checks, so its message is
// shown as-is apart from these two, which read better in plain language.
const friendlyError = (error) => {
  const message = getErrorMessage(error);
  if (/active subscription required/i.test(message)) {
    return "Your subscription is inactive. Activate a plan to create projects.";
  }
  if (/project limit reached/i.test(message)) {
    return "You have reached your project limit. Upgrade your plan to create another project.";
  }
  return message;
};

// The backend generates the slug from the name, so it is never sent.
const ProjectForm = ({ project, onClose, onSaved }) => {
  const isEdit = Boolean(project);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setNameError("Project name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
      };
      const data = isEdit
        ? await updateProject(project.projectId, payload)
        : await createProject(payload);
      onSaved(data.message || "Project saved", data.project);
    } catch (error) {
      if (getErrorStatus(error) === 409) {
        setNameError("A project with this name already exists.");
      } else {
        setFormError(friendlyError(error));
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
            {isEdit ? "Edit project" : "New project"}
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
            Name
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            placeholder="My Website"
            autoFocus
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-100 ${
              nameError
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-indigo-500"
            }`}
          />
          {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}

          <label className="mt-4 mb-1.5 block text-sm font-medium text-slate-700">
            Description
            <span className="ml-1 font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What this project is for"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
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
              {isEdit ? "Save changes" : "Create project"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formFor, setFormFor] = useState(null); // {} = create, project = edit
  const [deleteState, setDeleteState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadProjects = () =>
    getProjects()
      .then((data) => {
        setProjects(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  const refresh = () => {
    setLoading(true);
    loadProjects();
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Straight into the new project so the next step is creating a collection
  const handleSaved = (message, project) => {
    const wasCreate = !formFor?.projectId;
    setFormFor(null);
    if (wasCreate && project?.projectId) {
      navigate(`/admin/projects/${project.projectId}/collections`);
      return;
    }
    setNotice(message);
    refresh();
  };

  // Soft delete: the backend sets isActive = false and the project drops out
  // of the list.
  const handleDelete = async () => {
    setBusy(true);
    try {
      const data = await deleteProject(deleteState.project.projectId);
      setDeleteState(null);
      setNotice(data.message || "Project deleted successfully");
      refresh();
    } catch (err) {
      setDeleteState((prev) => ({ ...prev, error: getErrorMessage(err) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Projects"
      subtitle={
        loading
          ? "Loading projects..."
          : `${projects.length} project${projects.length === 1 ? "" : "s"}`
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
            <FiPlus size={16} /> New project
          </button>
        </div>
      }
    >
      {notice && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}>
            <FiX size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
          <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <FiFolder className="mx-auto mb-3 text-slate-300" size={32} />
          <h3 className="font-medium text-slate-800">No projects yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create a project to start adding collections.
          </p>
          <button
            onClick={() => setFormFor({})}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <FiPlus size={16} /> New project
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.projectId}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-sm"
            >
              <Link
                to={`/admin/projects/${project.projectId}`}
                className="group min-w-0 flex-1"
              >
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
                    {project.name}
                  </h3>
                  <FiChevronRight
                    className="shrink-0 text-slate-300 group-hover:text-indigo-500"
                    size={16}
                  />
                </div>
                <p className="mt-1 truncate font-mono text-xs text-slate-400">
                  {project.slug}
                </p>
                <p className="mt-2 truncate text-sm text-slate-500">
                  {project.description || "No description"}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {project._count?.collections ?? 0} collections ·{" "}
                  {project._count?.apiKeys ?? 0} API keys
                </p>
              </Link>

              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <Link
                  to={`/admin/projects/${project.projectId}`}
                  className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Open
                </Link>
                <button
                  onClick={() => setFormFor(project)}
                  title="Edit project"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 transition hover:bg-slate-50"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteState({ project, error: "" })}
                  title="Delete project"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formFor && (
        <ProjectForm
          project={formFor.projectId ? formFor : null}
          onClose={() => setFormFor(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteState && (
        <ConfirmDialog
          title="Delete project?"
          message={`Are you sure you want to delete "${deleteState.project.name}"? It will be deactivated and removed from your project list.`}
          error={deleteState.error}
          busy={busy}
          onCancel={() => setDeleteState(null)}
          onConfirm={handleDelete}
        />
      )}
    </PageShell>
  );
};

export default Projects;