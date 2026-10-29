import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  FiSend,
  FiCopy,
  FiCheck,
  FiDatabase,
  FiFileText,
  FiLoader,
  FiKey,
  FiImage,
} from "react-icons/fi";
import { getCollections } from "../api/collectionApi";
import { getForms } from "../api/formApi";
import { getFormFields } from "../api/formFieldApi";
import { isFileField } from "../utils/recordFields";
import { publicCollection, publicFormSubmit } from "../utils/publicApi";

// The public API authenticates with this header, not the admin session cookie.
const KEY_HEADER = "x-api-key";

// A realistic example value so the body shows the shape and the type.
const sampleFor = (field) => {
  switch (field.type) {
    case "NUMBER":
      return 0;
    case "BOOLEAN":
      return true;
    case "EMAIL":
      return "name@example.com";
    case "PHONE":
      return "9876543210";
    case "URL":
      return "https://example.com";
    case "DATE":
      return "2026-01-01";
    case "TIME":
      return "09:00";
    case "DATETIME":
      return "2026-01-01T09:00:00.000Z";
    case "MULTI_SELECT":
    case "CHECKBOX":
      return field.options?.length ? [field.options[0]] : [];
    case "SELECT":
    case "RADIO":
      return field.options?.[0] ?? "";
    default:
      return "";
  }
};

// Fields go at the top level of the body, not wrapped in a `data` object.
// Files are sent as their own multipart parts, so they stay out of the JSON.
const buildTemplate = (fields) => {
  const shape = {};
  fields
    .filter((field) => !isFileField(field.type))
    .forEach((field) => {
      shape[field.name] = sampleFor(field);
    });
  return JSON.stringify(shape, null, 2);
};

const EMPTY_BODY = "{}";

// The textarea can hold half-typed JSON, so parsing never throws here.
const parseBody = (text) => {
  try {
    const value = JSON.parse(text || EMPTY_BODY);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

const curlFor = (endpoint, apiKey, body, files) => {
  const key = apiKey || "YOUR_API_KEY";
  const lines = [
    `curl -X ${endpoint.method} "${endpoint.url}"`,
    `  -H "${KEY_HEADER}: ${key}"`,
  ];
  if (endpoint.method === "GET") return lines.join(" \\\n");

  const picked = Object.entries(files || {}).filter(([, file]) => file);
  if (picked.length) {
    // multipart: each value as its own part, then one part per file
    Object.entries(parseBody(body)).forEach(([key, value]) =>
      lines.push(
        `  -F "${key}=${typeof value === "string" ? value : JSON.stringify(value)}"`,
      ),
    );
    picked.forEach(([name, file]) =>
      lines.push(`  -F "${name}=@/path/to/${file.name}"`),
    );
  } else {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '${(body || "{}").replace(/\s+/g, " ").trim()}'`);
  }
  return lines.join(" \\\n");
};

// Walks the response for anything that looks like an uploaded image.
const collectImages = (node, found = []) => {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((item) => collectImages(item, found));
    return found;
  }
  const looksLikeImage =
    typeof node.url === "string" &&
    (node.type === "IMAGE" || /^image\//.test(node.mimeType || ""));
  if (looksLikeImage) found.push(node);
  Object.values(node).forEach((value) => collectImages(value, found));
  return found;
};

const CopyButton = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
    >
      {copied ? (
        <FiCheck size={13} className="text-emerald-600" />
      ) : (
        <FiCopy size={13} />
      )}
      {copied ? "Copied" : label}
    </button>
  );
};

const ApiTesterTab = () => {
  const { projectId, project } = useOutletContext();
  const [endpoints, setEndpoints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [fields, setFields] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState(EMPTY_BODY);
  const [files, setFiles] = useState({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCollections(projectId).catch(() => []),
      getForms(projectId).catch(() => []),
    ]).then(([collections, forms]) => {
      if (cancelled) return;
      const slug = project?.slug;
      const list = [
        // kind is shown in the picker: names can repeat across the two
        ...collections.map((c) => ({
          id: `c-${c.collectionId}`,
          label: c.name,
          kind: "Collection",
          ...publicCollection(slug, c.slug),
        })),
        ...forms.map((f) => ({
          id: `f-${f.formId}`,
          label: f.name,
          kind: "Form",
          formId: f.formId,
          ...publicFormSubmit(slug, f.slug),
        })),
      ].filter((item) => item.url);
      setEndpoints(list);
      setSelected((current) => current || list[0] || null);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, project?.slug]);

  // Switching endpoint clears the previous attempt
  const chooseEndpoint = (next) => {
    setSelected(next);
    setFiles({});
    setResult(null);
    if (!next?.formId) {
      setFields([]);
      setBody(EMPTY_BODY);
    }
  };

  // Show the exact body shape for the chosen form, built from its fields
  useEffect(() => {
    if (!selected?.formId) return undefined;
    let cancelled = false;
    getFormFields(selected.formId)
      .then((list) => {
        if (cancelled) return;
        setFields(list);
        setBody(buildTemplate(list));
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const fileFields = fields.filter((field) => isFileField(field.type));
  const pickedFiles = Object.entries(files).filter(([, file]) => file);

  const send = async () => {
    if (!selected) return;
    setSending(true);
    setResult(null);
    const startedAt = performance.now();
    try {
      const options = { method: selected.method, headers: { [KEY_HEADER]: apiKey } };

      if (selected.method !== "GET") {
        if (pickedFiles.length) {
          // Each value becomes its own part, matching the unwrapped JSON shape
          const form = new FormData();
          Object.entries(parseBody(body)).forEach(([key, value]) =>
            form.append(
              key,
              typeof value === "string" ? value : JSON.stringify(value),
            ),
          );
          pickedFiles.forEach(([name, file]) => form.append(name, file));
          options.body = form; // Content-Type is set by the browser
        } else {
          options.headers["Content-Type"] = "application/json";
          options.body = body;
        }
      }

      const response = await fetch(selected.url, options);
      const text = await response.text();
      let parsed = null;
      let pretty = text;
      try {
        parsed = JSON.parse(text);
        pretty = JSON.stringify(parsed, null, 2);
      } catch {
        // leave non-JSON responses as they are
      }
      setResult({
        status: response.status,
        ok: response.ok,
        ms: Math.round(performance.now() - startedAt),
        body: pretty,
        images: parsed ? collectImages(parsed) : [],
      });
    } catch (err) {
      setResult({
        status: 0,
        ok: false,
        ms: Math.round(performance.now() - startedAt),
        body: `Request failed: ${err.message}\n\nThis is usually CORS or the server being unreachable.`,
        images: [],
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-slate-500">
        Try the public endpoints the way a website would call them. Requests go
        straight from your browser using the {KEY_HEADER} header.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Endpoint
            </label>
            <select
              value={selected?.id || ""}
              onChange={(e) =>
                chooseEndpoint(endpoints.find((x) => x.id === e.target.value))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {endpoints.length === 0 && <option>No endpoints yet</option>}
              {endpoints.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kind} - {item.label} - {item.method}
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-2 flex items-center gap-2">
                {/* Which of the two this endpoint came from */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    selected.kind === "Form"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-indigo-50 text-indigo-700"
                  }`}
                >
                  {selected.kind}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500">
                  {selected.method} {selected.display || selected.path}
                </span>
                <CopyButton text={selected.url} label="URL" />
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <FiKey size={14} /> API key
            </label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="cms_live_¦"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Paste a key from the API Keys tab. It is only held in this page and
              never saved.
            </p>
          </div>

          {selected?.method !== "GET" && (
            <>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Request body
                  </label>
                  {fields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBody(buildTemplate(fields))}
                      className="text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
                    >
                      Reset to this form's shape
                    </button>
                  )}
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Keys are the field names of this form.
                  {fileFields.length > 0 &&
                    " File fields are sent separately, below."}
                </p>
              </div>

              {fileFields.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <FiImage size={13} /> File fields
                  </p>
                  <div className="space-y-2">
                    {fileFields.map((field) => (
                      <div key={field.fieldId}>
                        <label className="mb-1 block font-mono text-xs text-slate-500">
                          {field.name}{" "}
                          <span className="text-slate-400">
                            ({field.type.toLowerCase()})
                          </span>
                        </label>
                        <input
                          type="file"
                          accept={field.type === "IMAGE" ? "image/*" : undefined}
                          onChange={(e) =>
                            setFiles((prev) => ({
                              ...prev,
                              [field.name]: e.target.files?.[0] || null,
                            }))
                          }
                          className="w-full cursor-pointer rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:text-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {pickedFiles.length
                      ? `Sends as multipart/form-data with ${pickedFiles.length} file part(s).`
                      : "Pick a file to send as multipart/form-data."}
                  </p>
                </div>
              )}
            </>
          )}

          <button
            onClick={send}
            disabled={sending || !selected || !apiKey.trim()}
            title={!apiKey.trim() ? "Paste an API key first" : undefined}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? (
              <FiLoader className="animate-spin" />
            ) : (
              <FiSend size={15} />
            )}
            Send request
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                For Postman / terminal
              </span>
              {selected && (
                <CopyButton
                  text={curlFor(selected, apiKey, body, files)}
                  label="Copy cURL"
                />
              )}
            </div>
            <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-3 font-mono text-xs whitespace-pre-wrap text-slate-600">
              {selected ? curlFor(selected, apiKey, body, files) : "â€”"}
            </pre>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                Response
              </span>
              {result && (
                <>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      result.ok
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {result.status || "error"}
                  </span>
                  <span className="text-xs text-slate-400">{result.ms} ms</span>
                  {/* So it is obvious whether the whole body arrived */}
                  <span className="text-xs text-slate-400">
                    {result.body.length.toLocaleString()} chars
                  </span>
                  <span className="ml-auto">
                    <CopyButton text={result.body} label="Copy response" />
                  </span>
                </>
              )}
            </div>

            {/* Says plainly when the response carried no image links at all,
                which usually means the endpoint did not return them. */}
            {result?.ok && result.images.length === 0 && (
              <p className="mb-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                No image links found in this response. If this collection has an
                image field, the endpoint is not returning its media.
              </p>
            )}

            {/* Images in the response are shown, not just their JSON */}
            {result?.images?.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-100 p-3">
                {result.images.map((media) => (
                  <a
                    key={media.mediaId || media.url}
                    href={media.url}
                    target="_blank"
                    rel="noreferrer"
                    title={media.originalName || media.url}
                  >
                    <img
                      src={media.url}
                      alt={media.originalName || "response image"}
                      className="h-20 w-20 rounded border border-slate-200 object-cover transition hover:opacity-90"
                    />
                  </a>
                ))}
              </div>
            )}

            <pre className="max-h-[28rem] min-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-3 font-mono text-xs whitespace-pre-wrap text-slate-600">
              {result?.body || "Send a request to see the response."}
            </pre>
          </div>
        </div>
      </div>

      {endpoints.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mb-2 flex justify-center gap-2 text-slate-300">
            <FiDatabase size={22} />
            <FiFileText size={22} />
          </div>
          <p className="text-sm text-slate-500">
            Create a collection or a form and its endpoint will appear here.
          </p>
        </div>
      )}
    </div>
  );
};

export default ApiTesterTab;
