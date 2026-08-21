import api from "./axios";

const BASE = "/records";

// Auth: every call goes through the shared axios instance, which is created
// with withCredentials: true, so the http-only auth cookie is sent on all five
// endpoints. Do not set it per call.
//
// tenantId is never sent: the backend reads it from the authenticated user.
// The payload is always wrapped in { data }, keyed by field slug.
// With files the payload is multipart: `data` holds the JSON, and each file is
// appended under its field slug. Without files it stays a plain JSON body.
// Content-Type is left alone so axios can set the multipart boundary.
const recordBody = (data, files) => {
  if (!files || Object.keys(files).length === 0) return { data };

  const form = new FormData();
  form.append("data", JSON.stringify(data));
  Object.entries(files).forEach(([slug, file]) => form.append(slug, file));
  return form;
};

export const createRecord = async (collectionId, data, files) => {
  const response = await api.post(
    `${BASE}/collections/${collectionId}`,
    recordBody(data, files),
  );
  return response.data;
};

export const getRecords = async (collectionId) => {
  const response = await api.get(`${BASE}/collections/${collectionId}`);
  return response.data.records || [];
};

export const getRecord = async (recordId) => {
  const response = await api.get(`${BASE}/${recordId}`);
  return response.data.record;
};

export const updateRecord = async (recordId, data, files) => {
  const response = await api.put(`${BASE}/${recordId}`, recordBody(data, files));
  return response.data;
};

export const deleteRecord = async (recordId) => {
  const response = await api.delete(`${BASE}/${recordId}`);
  return response.data;
};
