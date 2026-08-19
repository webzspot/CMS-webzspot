import api from "./axios";

const BASE = "/forms";

// Mirrors the backend FormFieldType enum. These differ from collection field
// types, which have their own enum in fieldApi.js.
export const FORM_FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "EMAIL", label: "Email" },
  { value: "NUMBER", label: "Number" },
  { value: "TEXTAREA", label: "Textarea" },
  { value: "SELECT", label: "Select" },
  { value: "MULTI_SELECT", label: "Multi-select" },
  { value: "RADIO", label: "Radio" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "DATE", label: "Date" },
  { value: "TIME", label: "Time" },
  { value: "DATETIME", label: "Date & time" },
  { value: "PHONE", label: "Phone" },
  { value: "URL", label: "URL" },
  { value: "FILE", label: "File" },
  { value: "IMAGE", label: "Image" },
];

// Only choice fields carry an options list.
const CHOICE_TYPES = ["SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX"];

export const typeUsesOptions = (type) => CHOICE_TYPES.includes(type);

// Create and list live at /fields/fields/forms/:formId. The router is mounted
// at /api/v1/fields and repeats /fields in its own path. Verified: the single
// path /fields/forms/:formId is not registered.
export const createFormField = async (formId, payload) => {
  const { data } = await api.post(`${BASE}/fields/${formId}`, payload);
  return data;
};

export const getFormFields = async (formId) => {
  const { data } = await api.get(`${BASE}/fields/${formId}`);
  return data.fields || [];
};

// NOTE: these three share their URLs with the collection field routes in
// fieldApi.js. The backend resolves a field id to one or the other.
export const getFormField = async (fieldId) => {
  const { data } = await api.get(`${BASE}/fields/${fieldId}`);
  return data.field;
};

// The backend rejects updates while the parent form is PUBLISHED.
export const updateFormField = async (fieldId, payload) => {
  const { data } = await api.put(`${BASE}/fields/${fieldId}`, payload);
  return data;
};

export const deleteFormField = async (fieldId) => {
  const { data } = await api.delete(`${BASE}/fields/${fieldId}`);
  return data;
};
