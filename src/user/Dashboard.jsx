import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiFolder,
  FiChevronRight,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import PageShell from "../components/PageShell";
import { getMyProjects } from "../api/userApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import { useAuth } from "../auth/authContext";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProjects = (goToLogin) =>
    getMyProjects()
      .then((data) => {
        setProjects(data);
        setError("");
      })
      .catch((err) => {
        const status = getErrorStatus(err);
        if (status === 401) {
          goToLogin();
          return;
        }
        setError(
          status === 403
            ? "Access denied. This area is for client users only."
            : getErrorMessage(err),
        );
      })
      .finally(() => setLoading(false));

  const goToLogin = () => navigate("/auth/login", { replace: true });

  const refresh = () => {
    setLoading(true);
    loadProjects(goToLogin);
  };

  useEffect(() => {
    loadProjects(() => navigate("/auth/login", { replace: true }));
  }, [navigate]);

  return (
    <PageShell
      title={`Welcome back, ${user?.name || "there"}`}
      subtitle={
        loading
          ? "Loading your projects..."
          : `${projects.length} project${projects.length === 1 ? "" : "s"} assigned to you`
      }
      actions={
        <button
          onClick={refresh}
          title="Refresh"
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
        >
          <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      }
    >
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
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <FiFolder className="mx-auto mb-3 text-slate-300" size={32} />
          <h3 className="font-medium text-slate-800">
            No projects have been assigned to you yet
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Your admin will give you access to a project.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.projectId}
              to={`/user/projects/${project.projectId}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"
            >
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
                  {project.name}
                </h3>
                <p className="mt-1 truncate font-mono text-xs text-slate-400">
                  {project.slug}
                </p>
                <p className="mt-2 truncate text-sm text-slate-500">
                  {project.description || "No description"}
                </p>
              </div>
              <FiChevronRight
                className="shrink-0 text-slate-300 transition group-hover:text-indigo-500"
                size={18}
              />
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
};

export default Dashboard;
