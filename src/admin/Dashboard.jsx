import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiFolder,
  FiKey,
  FiDatabase,
  FiHardDrive,
  FiActivity,
  FiArrowRight,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import PageShell from "../components/PageShell";
import { getUsageDetails } from "../api/usageApi";
import { getErrorMessage } from "../api/axios";

// Byte counts arrive as strings because they can exceed a safe integer.
// Scales all the way to TB so a large limit never reads as "9000.00 GB".
const formatBytes = (value) => {
  const bytes = Number(value ?? 0);
  if (!bytes) return "0 KB";
  const units = [
    { size: 1024 ** 4, label: "TB" },
    { size: 1024 ** 3, label: "GB" },
    { size: 1024 ** 2, label: "MB" },
    { size: 1024, label: "KB" },
  ];
  const unit = units.find((u) => bytes >= u.size) || units[units.length - 1];
  const scaled = bytes / unit.size;
  // Whole numbers read better without trailing zeros: "9 GB" not "9.00 GB"
  return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(2)} ${unit.label}`;
};

const formatCount = (value) => Number(value ?? 0).toLocaleString("en-US");

const StatCard = ({ label, icon: Icon, value, sub }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5">
    <div className="flex items-start justify-between">
      <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <Icon className="shrink-0 text-indigo-600" size={16} />
    </div>
    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
      {value}
    </p>
    <p className="mt-1 text-xs text-slate-400">{sub}</p>
  </div>
);

// used / limit as a bar. A null or unlimited limit shows no bar.
const UsageBar = ({ label, used, limit, unlimited }) => {
  const pct =
    unlimited || !limit ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">
          {label}
        </span>
        <span className="font-mono text-xs text-slate-500">
          {formatCount(used)} / {unlimited ? "Unlimited" : formatCount(limit)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 90 ? "bg-red-500" : "bg-indigo-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const resourceSub = (resource) => {
  if (!resource) return "—";
  return resource.unlimited
    ? "unlimited"
    : `of ${formatCount(resource.limit)} allowed`;
};

const Dashboard = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    getUsageDetails()
      .then((data) => {
        setUsage(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  const refresh = () => {
    setLoading(true);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  const plan = usage?.plan;
  const storage = usage?.usage?.storage;
  const apiUsage = usage?.usage?.api;
  const resources = usage?.usage?.resources;

  return (
    <PageShell
      title="Overview"
      subtitle={
        loading
          ? "Loading your plan..."
          : plan
            ? `Plan: ${plan.name}`
            : "Your plan and usage"
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white"
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
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Projects"
              icon={FiFolder}
              value={formatCount(resources?.projects?.used)}
              sub={resourceSub(resources?.projects)}
            />
            <StatCard
              label="Active keys"
              icon={FiKey}
              value={formatCount(resources?.apiKeys?.used)}
              sub={resourceSub(resources?.apiKeys)}
            />
            <StatCard
              label="Collections"
              icon={FiDatabase}
              value={formatCount(resources?.collections?.used)}
              sub={resourceSub(resources?.collections)}
            />
            <StatCard
              label="Storage"
              icon={FiHardDrive}
              value={formatBytes(storage?.usedBytes)}
              sub={
                storage?.unlimited
                  ? "unlimited"
                  : `of ${formatBytes(storage?.limitBytes)}`
              }
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Monthly requests
                </h2>
                <FiActivity className="text-indigo-600" size={16} />
              </div>
              <div className="space-y-4">
                <UsageBar
                  label="Get"
                  used={apiUsage?.get?.used}
                  limit={apiUsage?.get?.limit}
                  unlimited={apiUsage?.get?.unlimited}
                />
                <UsageBar
                  label="Write"
                  used={apiUsage?.write?.used}
                  limit={apiUsage?.write?.limit}
                  unlimited={apiUsage?.write?.unlimited}
                />
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Write covers POST, PUT and DELETE together, which is how the
                backend counts them.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Get started
              </h2>
              <div className="space-y-2">
                {[
                  { to: "/admin/projects", label: "Create a project" },
                  { to: "/admin/billing", label: "Upgrade plan" },
                  { to: "/admin/team", label: "Invite your team" },
                  { to: "/admin/settings", label: "Profile settings" },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                  >
                    {item.label}
                    <FiArrowRight
                      size={15}
                      className="text-slate-300 transition group-hover:text-indigo-500"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {storage && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-base font-semibold text-slate-900">
                  Storage
                </h2>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                    Used
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {formatBytes(storage.usedBytes)} /{" "}
                    {storage.unlimited
                      ? "Unlimited"
                      : formatBytes(storage.limitBytes)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      storage.percentage >= 90 ? "bg-red-500" : "bg-indigo-600"
                    }`}
                    style={{
                      width: `${storage.unlimited ? 0 : Math.min(100, storage.percentage || 0)}%`,
                    }}
                  />
                </div>
                {!storage.unlimited && (
                  <p className="mt-2 text-xs text-slate-400">
                    {formatBytes(storage.remainingBytes)} remaining
                  </p>
                )}
              </div>
            )}

            {resources?.teamMembers && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-base font-semibold text-slate-900">
                  Team
                </h2>
                <UsageBar
                  label="Members"
                  used={resources.teamMembers.used}
                  limit={resources.teamMembers.limit}
                  unlimited={resources.teamMembers.unlimited}
                />
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
};

export default Dashboard;
