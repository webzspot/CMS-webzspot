import PageShell from "./PageShell";
import { useAuth } from "../auth/authContext";

// Placeholder dashboard shared by the three portals until their APIs exist.
const DashboardHome = ({ title, description }) => {
  const { user } = useAuth();

  const details = [
    { label: "Name", value: user?.name },
    { label: "Email", value: user?.email },
    { label: "Role", value: user?.role },
    { label: "Tenant ID", value: user?.tenantId },
  ];

  return (
    <PageShell title={title} subtitle={description}>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Welcome back, {user?.name || "there"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          You are signed in. Use the menu on the left to get started.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {details.map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-50 p-4">
              <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                {item.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-medium text-slate-800">
                {item.value || "-"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </PageShell>
  );
};

export default DashboardHome;
