import {
  FiInbox,
  FiAlertCircle,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiFile,
  FiExternalLink,
  FiFolder,
  FiDatabase,
  FiFileText,
} from "react-icons/fi";
import { dash, dateCell } from "./format";
import { formatBytes } from "../utils/planFormat";

export const Status = ({ value }) => {
  const tone =
    value === "ACTIVE" || value === "SUCCESS" || value === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700"
      : value === "PENDING" || value === "CREATED" || value === "DRAFT"
        ? "bg-amber-50 text-amber-700"
        : value === "FAILED" || value === "CANCELLED" || value === "EXPIRED"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {dash(value)}
    </span>
  );
};

export const Empty = ({ text }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
    <FiInbox className="mx-auto mb-3 text-slate-300" size={28} />
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

// A 404 gets its own state with a way back, separate from a 500 with Retry.
export const NotFound = ({ message, onBack, backLabel }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
    <FiAlertCircle className="mx-auto mb-3 text-slate-300" size={28} />
    <h3 className="font-medium text-slate-800">Not found</h3>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
    <button
      onClick={onBack}
      className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <FiArrowLeft size={14} /> Back to {backLabel}
    </button>
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
    <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
    <p className="text-sm text-red-700">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
      >
        Try Again
      </button>
    )}
  </div>
);

export const Skeleton = ({ className = "h-56" }) => (
  <div
    className={`${className} animate-pulse rounded-xl border border-slate-200 bg-white`}
  />
);

export const Table = ({ columns, rows, render, empty, minWidth = 720 }) =>
  rows.length === 0 ? (
    <Empty text={empty} />
  ) : (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-slate-100 text-left">
            {columns.map((column, index) => (
              <th
                key={column || index}
                className="px-5 py-3 font-medium text-slate-500"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(render)}</tbody>
      </table>
    </div>
  );

export const OpenButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
  >
    Open
  </button>
);

// Built entirely from the backend's pagination object: hasNextPage and
// hasPreviousPage drive the buttons, never the length of the returned array.
export const Pagination = ({ pagination, onPage }) => {
  if (!pagination || (pagination.totalPages ?? 1) <= 1) return null;
  const { page, totalPages, total, hasNextPage, hasPreviousPage } = pagination;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm">
      <p className="text-slate-500">
        Page {page} of {totalPages}
        {total != null && ` · ${total} in total`}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={!hasPreviousPage}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiChevronLeft size={14} /> Previous
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={!hasNextPage}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

// Loading / error / list + pagination for any paginated sub-tab.
export const PagedSection = ({ list, onPage, onRetry, children }) =>
  list.loading ? (
    <Skeleton className="h-48" />
  ) : list.error ? (
    <ErrorBox message={list.error} onRetry={onRetry} />
  ) : (
    <>
      {children}
      <Pagination pagination={list.pagination} onPage={onPage} />
    </>
  );

export const MediaGrid = ({ media, empty = "No files attached." }) =>
  media.length === 0 ? (
    <Empty text={empty} />
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {media.map((item, index) => (
        <div
          key={item.mediaId || item.url || index}
          className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
        >
          {item.url && item.mimeType?.startsWith("image/") ? (
            <img
              src={item.url}
              alt={item.originalName || "attachment"}
              className="mb-3 h-40 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="mb-3 flex h-40 w-full items-center justify-center rounded-lg bg-slate-50">
              <FiFile className="text-slate-300" size={32} />
            </div>
          )}
          <p className="truncate text-sm font-medium text-slate-800">
            {dash(item.originalName || item.filename)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {dash(item.mimeType)} · {formatBytes(item.size)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{dateCell(item.createdAt)}</p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              Open file <FiExternalLink size={11} />
            </a>
          )}
        </div>
      ))}
    </div>
  );

// Sits under the tenant header instead of replacing it: a breadcrumb back up
// the hierarchy, the current item's name, and its own small set of sub-tabs.
// What kind of thing is open, shown alongside its name. A name like "testing"
// says nothing about whether it is a collection or a form, so the type gets
// its own icon, colour and label — the name itself is left exactly as it is.
const KIND_STYLE = {
  project: { label: "Project", icon: FiFolder, tone: "bg-indigo-50 text-indigo-600" },
  collection: {
    label: "Collection",
    icon: FiDatabase,
    tone: "bg-sky-50 text-sky-600",
  },
  form: { label: "Form", icon: FiFileText, tone: "bg-violet-50 text-violet-600" },
};

export const PanelHeader = ({
  crumbs,
  kind,
  title,
  status,
  tabs,
  activeTab,
  onTab,
}) => {
  const style = KIND_STYLE[kind];
  const Icon = style?.icon;

  return (
  <div className="mb-6">
    <nav className="flex flex-wrap items-center gap-1.5 text-sm">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-slate-300">/</span>}
          {crumb.onClick ? (
            <button
              onClick={crumb.onClick}
              className="text-slate-500 transition hover:text-slate-900"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="font-medium text-slate-900">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {style && (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.tone}`}
          >
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0">
          {style && (
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {style.label}
            </p>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {status && <Status value={status} />}
          </div>
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTab(tab.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  </div>
  );
};
