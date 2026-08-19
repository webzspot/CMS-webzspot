import { useState } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";

// Shows a public endpoint and copies the absolute URL. Rows often sit inside a
// <Link>, so the click must not navigate.
const CopyEndpoint = ({ endpoint }) => {
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
        title={endpoint.url}
        className="truncate font-mono text-xs text-slate-500"
      >
        <span className="text-slate-400">{endpoint.method}</span>{" "}
        {endpoint.path}
      </span>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied" : `Copy full URL: ${endpoint.url}`}
        className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
      >
        {copied ? (
          <FiCheck size={12} className="text-emerald-600" />
        ) : (
          <FiCopy size={12} />
        )}
      </button>
    </span>
  );
};

export default CopyEndpoint;
