import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiKey,
  FiDatabase,
  FiImage,
  FiFileText,
  FiBarChart2,
} from "react-icons/fi";
import { getProject } from "../api/projectApi";
import { getErrorMessage } from "../api/axios";
import { useAuth } from "../auth/authContext";

const TABS = [
  { to: "api-keys", label: "API Keys", icon: FiKey },
  { to: "collections", label: "Collections", icon: FiDatabase },
  { to: "media", label: "Media", icon: FiImage },
  { to: "forms", label: "Forms", icon: FiFileText },
  { to: "analytics", label: "Analytics", icon: FiBarChart2 },
];

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getProject(projectId)
      .then((data) => {
        setProject(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [projectId, tenantId]);

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 pt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-slate-900">
                {project?.name || "Project"}
              </h1>
              <p className="mt-1 truncate font-mono text-sm text-slate-400">
                {project?.slug || projectId}
              </p>
              {project?._count && (
                <p className="mt-1 text-xs text-slate-500">
                  {project._count.collections ?? 0} collections ·{" "}
                  {project._count.apiKeys ?? 0} API keys
                </p>
              )}
            </div>
            <button
              onClick={() => navigate("/admin/projects")}
              className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              <FiArrowLeft size={16} /> Back
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <nav className="mt-6 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`
                }
              >
                <tab.icon size={15} />
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <Outlet context={{ projectId, project }} />
      </div>
    </div>
  );
};

export default ProjectDetail;
