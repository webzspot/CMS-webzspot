import api from "./axios";

const BASE = "/collections";

// Create is the only collection route that needs tenantId in the body. The
// others resolve the tenant from the collection itself, and sending it to them
// makes the backend fail.
export const createCollection = async (projectId, tenantId, payload) => {
  const { data } = await api.post(`${BASE}/projects/${projectId}`, {
    tenantId,
    ...payload,
  });
  return data;
};

export const getCollections = async (projectId) => {
  const { data } = await api.get(`${BASE}/projects/${projectId}`);
  return data.collections || [];
};

export const getCollection = async (collectionId) => {
  const { data } = await api.get(`${BASE}/${collectionId}`);
  return data.collection;
};

export const updateCollection = async (collectionId, payload) => {
  const { data } = await api.put(`${BASE}/${collectionId}`, payload);
  return data;
};

export const deleteCollection = async (collectionId) => {
  const { data } = await api.delete(`${BASE}/${collectionId}`);
  return data;
};

export const publishCollection = async (collectionId) => {
  const { data } = await api.put(`${BASE}/${collectionId}/publish`, {});
  return data;
};

export const unpublishCollection = async (collectionId) => {
  const { data } = await api.put(`${BASE}/${collectionId}/unpublish`, {});
  return data;
};
