import api from "./axios";

const BASE = "/api-keys";

// Auth rides on the shared axios instance (withCredentials: true). tenantId is
// never sent; the backend reads it from the authenticated user.
//
// The raw key is returned ONLY by create. Every other endpoint returns just
// keyPrefix, so the raw value can never be recovered afterwards.
export const createApiKey = async (projectId, name) => {
  const { data } = await api.post(`${BASE}/projects/${projectId}`, { name });
  return data;
};

export const getApiKeys = async (projectId) => {
  const { data } = await api.get(`${BASE}/projects/${projectId}`);
  return data.apiKeys || [];
};

export const getApiKey = async (apiKeyId) => {
  const { data } = await api.get(`${BASE}/${apiKeyId}`);
  return data.apiKey;
};

export const revokeApiKey = async (apiKeyId) => {
  const { data } = await api.put(`${BASE}/${apiKeyId}/revoke`);
  return data;
};

export const activateApiKey = async (apiKeyId) => {
  const { data } = await api.put(`${BASE}/${apiKeyId}/activate`);
  return data;
};

export const deleteApiKey = async (apiKeyId) => {
  const { data } = await api.delete(`${BASE}/${apiKeyId}`);
  return data;
};
