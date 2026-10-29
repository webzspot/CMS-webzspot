import { useState } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";

// Shows a public endpoint and copies the absolute URL. Rows often sit inside a
// <Link>, so the click must not navigate. The screen shows `display` (ids
// replaced by placeholders); only the copied URL carries the real ids.
const CopyEndpoint = ({ endpoint, size = "xs" }) => {
  const [copied, setCopied] = useState(false);

  // Nothing to show until the slugs it is built from are available
  if (!endpoint) return null;

  const copy = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(endpoint.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        className={`truncate font-mono ${
          size === "sm" ? "text-sm text-slate-400" : "text-xs text-slate-500"
        }`}
      >
        <span className="text-slate-400">{endpoint.method}</span>{" "}
        {endpoint.display || endpoint.path}
      </span>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied" : "Copy full URL"}
        className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
      >
        {copied ? (
          <FiCheck size={size === "sm" ? 14 : 12} className="text-emerald-600" />
        ) : (
          <FiCopy size={size === "sm" ? 14 : 12} />
        )}
      </button>
    </span>
  );
};

export default CopyEndpoint;
