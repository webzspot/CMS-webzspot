import { formatDate } from "../utils/planFormat";

// Nullable dates and optional fields turn up throughout these responses.
export const dash = (value) =>
  value === null || value === undefined || value === "" ? "—" : value;

export const dateCell = (value) => (value ? formatDate(value) : "—");

export const prettyJson = (value) => {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// A free-form payload as "key: value" pairs for a table cell. `max` caps the
// number of keys and `cut` the length of each value; pass Infinity for both
// when the row is the only place the data is shown.
export const summarise = (value, max = 3, cut = 28) => {
  if (!value || typeof value !== "object") return dash(value);
  const parts = Object.entries(value)
    .slice(0, max)
    .map(([key, item]) => {
      const text =
        item && typeof item === "object"
          ? Array.isArray(item)
            ? `${item.length} items`
            : JSON.stringify(item)
          : String(item ?? "—");
      return `${key}: ${text.length > cut ? `${text.slice(0, cut)}…` : text}`;
    });
  const extra = Object.keys(value).length - parts.length;
  return parts.join(" · ") + (extra > 0 ? ` · +${extra} more` : "");
};

// Row number across pages, so page 2 starts at 26 rather than 1 again.
export const rowNumber = (pagination, index) =>
  ((pagination?.page || 1) - 1) * (pagination?.limit || 25) + index + 1;
