import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiDatabase, FiFileText } from "react-icons/fi";
import { getMyProject, formsOf } from "../api/userApi";
import { getErrorMessage } from "../api/axios";

// Only the two areas a client user is allowed to work in. API keys, media and
// analytics stay admin-only.
const TABS = [
  { to: "collections", label: "Collections", icon: FiDatabase },
  { to: "forms", label: "Forms", icon: FiFileText },
];

const ProjectLayout = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyProject(projectId)
      .then((data) => {
        setProject(data);
        setError(data ? "" : "You do not have access to this project.");
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [projectId]);

  const forms = formsOf(project);

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
              {project && (
                <p className="mt-1 text-xs text-slate-500">
                  {forms.length} form{forms.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate("/user/dashboard")}
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
        <Outlet context={{ projectId, project, forms }} />
      </div>
    </div>
  );
};

export default ProjectLayout;
