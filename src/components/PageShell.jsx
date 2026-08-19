// Standard page frame: title block on top, content below.
const PageShell = ({ title, subtitle, actions, children }) => (
  <div className="mx-auto max-w-7xl px-6 py-10">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
    <div className="mt-8">{children}</div>
  </div>
);

export default PageShell;
