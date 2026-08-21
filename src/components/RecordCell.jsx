import { useState } from "react";
import { FiFile, FiExternalLink, FiAlertTriangle } from "react-icons/fi";
import { formatCell, isFileField, mediaFor } from "../utils/recordFields";

const sizeLabel = (bytes) => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
};

// Uploads live in record.media[], keyed by fieldId, and are shown from their
// stored URL. Everything else comes from record.data by slug.
// `dataKey` is which property of the field names the answer inside data:
// collection fields use slug, form fields use name. Uploads are found through
// media[] by fieldId in both cases.
const RecordCell = ({ field, record, dataKey = "slug", size = "cell" }) => {
  // The stored file may not be readable (private bucket, empty upload), so the
  // cell falls back to a link rather than showing a broken image.
  const [imageFailed, setImageFailed] = useState(false);

  const key = field[dataKey] ?? field.slug ?? field.name;

  if (!isFileField(field.type)) {
    return <>{formatCell(field, record?.data?.[key])}</>;
  }

  const media = mediaFor(record, field);
  if (!media?.url) return <span className="text-slate-400">—</span>;

  const isImage =
    field.type === "IMAGE" || media.mimeType?.startsWith("image/");

  if (media.size === 0) {
    return (
      <span
        title="This upload stored 0 bytes"
        className="inline-flex items-center gap-1.5 text-xs text-amber-700"
      >
        <FiAlertTriangle size={13} className="shrink-0" />
        <span className="truncate">{media.originalName} (empty)</span>
      </span>
    );
  }

  if (isImage && !imageFailed) {
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noreferrer"
        title={media.originalName}
        onClick={(e) => e.stopPropagation()}
        className="inline-block"
      >
        <img
          src={media.url}
          alt={media.originalName || field.name}
          onError={() => setImageFailed(true)}
          className={`rounded border border-slate-200 object-cover ${
            size === "detail" ? "max-h-40 max-w-full" : "h-10 w-10"
          }`}
        />
      </a>
    );
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-indigo-600 transition hover:underline"
    >
      <FiFile size={14} className="shrink-0" />
      <span className="truncate">{media.originalName || "Download"}</span>
      {media.size ? (
        <span className="shrink-0 text-xs text-slate-400">
          {sizeLabel(media.size)}
        </span>
      ) : null}
      <FiExternalLink size={12} className="shrink-0 text-slate-400" />
    </a>
  );
};

export default RecordCell;
