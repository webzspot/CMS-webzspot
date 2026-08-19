import api from "./axios";

const BASE = "/records";

// Auth: every call goes through the shared axios instance, which is created
// with withCredentials: true, so the http-only auth cookie is sent on all five
// endpoints. Do not set it per call.
//
// tenantId is never sent: the backend reads it from the authenticated user.
// The payload is always wrapped in { data }, keyed by field slug.
export const createRecord = async (collectionId, data) => {
  const response = await api.post(`${BASE}/collections/${collectionId}`, {
    data,
  });
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

export const updateRecord = async (recordId, data) => {
  const response = await api.put(`${BASE}/${recordId}`, { data });
  return response.data;
};

export const deleteRecord = async (recordId) => {
  const response = await api.delete(`${BASE}/${recordId}`);
  return response.data;
};
