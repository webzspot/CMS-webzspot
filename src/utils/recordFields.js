// Helpers for turning a collection's field definitions into record form
// values and back. Shared by the admin and user portals.

// IMAGE and FILE values travel as multipart parts keyed by field slug, not
// inside the JSON `data` object.
export const isFileField = (type) => type === "IMAGE" || type === "FILE";

// Uploads are not stored in `data`. They come back in the record's media[],
// linked to the collection field by fieldId.
export const mediaFor = (record, field) =>
  (record?.media || []).find((item) => item.fieldId === field.fieldId) || null;

// Splits the form values into the JSON `data` object and the files that go
// alongside it. Record values are keyed by field slug; NUMBER must go as a
// number and BOOLEAN as a real boolean, so each type is converted here.
export const splitRecordValues = (fields, values) => {
  const data = {};
  const files = {};

  fields.forEach((field) => {
    const raw = values[field.slug];

    if (isFileField(field.type)) {
      // Only a newly picked file is sent. The existing upload lives in media[]
      // on the backend, so it must not be echoed back inside `data`.
      if (raw instanceof File) files[field.slug] = raw;
      return;
    }
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

  return { data, files };
};

export const toFormValues = (fields, record) => {
  const values = {};
  fields.forEach((field) => {
    if (isFileField(field.type)) {
      // Keep the stored file's name so the form can say what is already there
      values[field.slug] = mediaFor(record, field)?.originalName || "";
      return;
    }
    const raw = record?.data?.[field.slug];
    if (field.type === "BOOLEAN") values[field.slug] = Boolean(raw);
    else if (field.type === "JSON")
      values[field.slug] = raw === undefined ? "" : JSON.stringify(raw, null, 2);
    else values[field.slug] = raw === undefined || raw === null ? "" : raw;
  });
  return values;
};

// Files are stored as a path or URL, so show the last segment.
const fileName = (value) => String(value).split("/").pop() || String(value);

export const formatCell = (field, value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "BOOLEAN") return value ? "Yes" : "No";
  if (field.type === "JSON") return JSON.stringify(value);
  if (isFileField(field.type)) return fileName(value);
  return String(value);
};

// Client-side mirror of the backend's checks. The backend stays authoritative.
export const validateRecord = (fields, values) => {
  const errors = {};
  fields.forEach((field) => {
    const raw = values[field.slug];

    if (isFileField(field.type)) {
      if (field.isRequired && !raw) errors[field.slug] = "Required";
      // A 0-byte File uploads as an empty object, so stop it here
      else if (raw instanceof File && raw.size === 0)
        errors[field.slug] =
          "This file is empty (0 bytes). Re-save or re-download it and try again.";
      return;
    }
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
