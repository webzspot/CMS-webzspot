import { FiBox } from "react-icons/fi";

// Shared frame for the login / register / verify screens.
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="rounded-lg bg-indigo-600 p-2 text-white">
          <FiBox size={18} />
        </span>
        <span className="text-lg font-semibold text-slate-900">CMSX</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {footer && (
        <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
      )}
    </div>
  </div>
);

export const Alert = ({ type = "error", children }) => {
  if (!children) return null;
  return (
    <div
      className={`mb-5 rounded-lg p-3 text-sm ${
        type === "success"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {children}
    </div>
  );
};

export const TextField = ({ label, error, ...props }) => (
  <div className="mb-4">
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
    </label>
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-100 ${
        error
          ? "border-red-400 focus:border-red-500"
          : "border-slate-200 focus:border-indigo-500"
      }`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export const SubmitButton = ({ loading, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
  >
    {loading ? "Please wait..." : children}
  </button>
);

export default AuthShell;
