import api from "./axios";

const BASE = "/forms";

// Auth rides on the shared axios instance (withCredentials: true) and the
// backend derives the tenant from req.user, so tenantId is never sent.
//
// Create and list use /forms/projects/:projectId. The backend renamed this
// route, so the old duplicated /forms/forms/... path no longer resolves.
export const createForm = async (projectId, payload) => {
  const { data } = await api.post(
    `${BASE}/projects/${projectId}`,
    payload,
  );
  return data;
};

export const getForms = async (projectId) => {
  const { data } = await api.get(`${BASE}/projects/${projectId}`);
  return data.forms || [];
};

export const getForm = async (formId) => {
  const { data } = await api.get(`${BASE}/${formId}`);
  return data.form;
};

// Only name, slug and description. Fields are not updated through this route.
export const updateForm = async (formId, payload) => {
  const { data } = await api.put(`${BASE}/${formId}`, payload);
  return data;
};

export const deleteForm = async (formId) => {
  const { data } = await api.delete(`${BASE}/${formId}`);
  return data;
};

// Publish and unpublish are PATCH, and the backend rejects publishing a form
// that has no fields.
export const publishForm = async (formId) => {
  const { data } = await api.patch(`${BASE}/${formId}/publish`, {});
  return data;
};

export const unpublishForm = async (formId) => {
  const { data } = await api.patch(`${BASE}/${formId}/unpublish`, {});
  return data;
};
