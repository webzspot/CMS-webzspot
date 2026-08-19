// Helpers for turning a collection's field definitions into record form
// values and back. Shared by the admin and user portals.

// Record values are keyed by field slug. NUMBER must go as a number and
// BOOLEAN as a real boolean, so each type is converted on the way out.
export const buildData = (fields, values) => {
  const data = {};
  fields.forEach((field) => {
    const raw = values[field.slug];
    if (field.type === "BOOLEAN") {
      data[field.slug] = Boolean(raw);
      return;
    }
    if (raw === "" || raw === undefined) return;
    if (field.type === "NUMBER") {
      data[field.slug] = Number(raw);
      return;
    }
    if (field.type === "JSON") {
      data[field.slug] = JSON.parse(raw);
      return;
    }
    data[field.slug] = raw;
  });
  return data;
};

export const toFormValues = (fields, record) => {
  const values = {};
  fields.forEach((field) => {
    const raw = record?.data?.[field.slug];
    if (field.type === "BOOLEAN") values[field.slug] = Boolean(raw);
    else if (field.type === "JSON")
      values[field.slug] = raw === undefined ? "" : JSON.stringify(raw, null, 2);
    else values[field.slug] = raw === undefined || raw === null ? "" : raw;
  });
  return values;
};

export const formatCell = (field, value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "BOOLEAN") return value ? "Yes" : "No";
  if (field.type === "JSON") return JSON.stringify(value);
  return String(value);
};

// Client-side mirror of the backend's checks. The backend stays authoritative.
export const validateRecord = (fields, values) => {
  const errors = {};
  fields.forEach((field) => {
    const raw = values[field.slug];
    if (field.isRequired && field.type !== "BOOLEAN" && `${raw}`.trim() === "") {
      errors[field.slug] = "Required";
      return;
    }
    if (field.type === "NUMBER" && raw !== "" && Number.isNaN(Number(raw))) {
      errors[field.slug] = "Must be a number";
    }
    if (field.type === "JSON" && `${raw}`.trim() !== "") {
      try {
        JSON.parse(raw);
      } catch {
        errors[field.slug] = "Must be valid JSON";
      }
    }
  });
  return errors;
};
