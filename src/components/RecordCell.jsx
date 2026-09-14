import { useState } from "react";
import { FiFile, FiExternalLink } from "react-icons/fi";
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

  // Whether a preview appears is decided by the URL loading, not by the
  // stored size, which can be wrong while the object itself is fine.
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
          className={`rounded border border-slate-200 transition ${
            size === "detail"
              ? "max-h-80 max-w-full object-contain"
              : "h-24 w-24 object-cover hover:opacity-90"
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
