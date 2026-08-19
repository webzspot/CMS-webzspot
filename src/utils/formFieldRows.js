import { typeUsesOptions } from "../api/formFieldApi";
import { snakify } from "./slug";

// Helpers for the row-based field editor. Kept out of the component file so
// Fast Refresh keeps working (a file may only export components).
export const emptyFieldRow = () => ({
  label: "",
  name: "",
  nameTouched: false,
  type: "TEXT",
  required: false,
  placeholder: "",
  options: "",
});

// Existing field -> editable row, so editing uses the same design as adding.
export const fieldToRow = (field) => ({
  label: field?.label ?? "",
  name: field?.name ?? "",
  nameTouched: true, // never re-derive the key of a saved field
  type: field?.type ?? "TEXT",
  required: field?.required ?? false,
  placeholder: field?.placeholder ?? "",
  options: Array.isArray(field?.options) ? field.options.join("\n") : "",
});

// Rows with a label become fields. Order in the list becomes displayOrder.
export const buildFieldPayloads = (rows) =>
  rows
    .filter((row) => row.label.trim())
    .map((row, index) => {
      const options = row.options
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      return {
        label: row.label.trim(),
        name: (row.name.trim() || snakify(row.label)).trim(),
        type: row.type,
        required: row.required,
        placeholder: row.placeholder.trim() || null,
        options: typeUsesOptions(row.type) && options.length ? options : null,
        displayOrder: index + 1,
      };
    });
