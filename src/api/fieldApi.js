import api from "./axios";

const BASE = "/fields";

// Exact values the backend accepts for `type`.
export const FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "BOOLEAN", label: "Boolean" },
  { value: "RICHTEXT", label: "Rich Text" },
  { value: "IMAGE", label: "Image" },
  { value: "FILE", label: "File" },
  { value: "DATE", label: "Date" },
  { value: "JSON", label: "JSON" },
];

// Create is the only field route that needs tenantId in the body.
export const createField = async (collectionId, tenantId, payload) => {
  const { data } = await api.post(`${BASE}/collections/${collectionId}`, {
    tenantId,
    ...payload,
  });
  return data;
};

export const getFields = async (collectionId) => {
  const { data } = await api.get(`${BASE}/collections/${collectionId}`);
  return data.fields || [];
};

export const getField = async (fieldId) => {
  const { data } = await api.get(`${BASE}/${fieldId}`);
  return data.field;
};

export const updateField = async (fieldId, payload) => {
  const { data } = await api.put(`${BASE}/${fieldId}`, payload);
  return data;
};

export const deleteField = async (fieldId) => {
  const { data } = await api.delete(`${BASE}/${fieldId}`);
  return data;
};
