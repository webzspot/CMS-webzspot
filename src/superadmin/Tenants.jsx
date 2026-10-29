import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBriefcase,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronRight,
  FiSearch,
} from "react-icons/fi";
import PageShell from "../components/PageShell";
import { getTenants } from "../api/superAdminApi";
import { getErrorMessage } from "../api/axios";
import { formatDate, formatPrice } from "../utils/planFormat";

// The list endpoint nests one ADMIN user and one latest ACTIVE subscription
// per tenant, both as arrays.
const adminOf = (tenant) => tenant.users?.[0] || null;
const subscriptionOf = (tenant) => tenant.subscription?.[0] || null;

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () =>
    getTenants()
      .then((data) => {
        setTenants(data);
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

  // The endpoint has no search, so filtering happens on what was returned.
  const term = search.trim().toLowerCase();
  const visible = term
    ? tenants.filter((tenant) =>
        [tenant.name, tenant.slug, adminOf(tenant)?.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term)),
      )
    : tenants;

  return (
    <PageShell
      title="Tenants"
      subtitle={
        loading
          ? "Loading tenants..."
          : `${tenants.length} tenant${tenants.length === 1 ? "" : "s"}`
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
      {tenants.length > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <FiSearch className="shrink-0 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug or admin email"
            className="min-w-0 flex-1 text-sm text-slate-800 outline-none"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
          <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <FiBriefcase className="mx-auto mb-3 text-slate-300" size={32} />
          <h3 className="font-medium text-slate-800">
            {tenants.length === 0 ? "No tenants yet" : "No matching tenants"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {tenants.length === 0
              ? "Tenants appear here once someone signs up."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {["Tenant", "Admin", "Plan", "Status", "Created", ""].map(
                  (column) => (
                    <th
                      key={column}
                      className="px-5 py-3 font-medium text-slate-500"
                    >
                      {column}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((tenant) => {
                const admin = adminOf(tenant);
                const subscription = subscriptionOf(tenant);

                return (
                  <tr
                    key={tenant.tenantId}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">
                        {tenant.name}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-400">
                        {tenant.slug}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {admin ? (
                        <>
                          <p className="text-slate-800">{admin.name}</p>
                          <p className="truncate text-xs text-slate-400">
                            {admin.email}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {subscription ? (
                        <>
                          <p className="text-slate-800">
                            {subscription.plan?.name || "—"}
                          </p>
                          <p className="text-xs text-slate-400">
                            ₹{formatPrice(subscription.planPrice)} ·{" "}
                            {subscription.billingCycle || "—"}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">Free / none</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          tenant.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tenant.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(tenant.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/super-admin/tenants/${tenant.tenantId}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        View <FiChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
};

export default Tenants;
