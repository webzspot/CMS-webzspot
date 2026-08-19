import api from "./axios";

const BASE = "/admin/users";

// Auth rides on the shared axios instance (withCredentials: true).
// tenantId is never sent: the backend derives it from the authenticated admin
// and uses it to scope every query to that tenant.
export const createClientUser = async (payload) => {
  const { data } = await api.post(BASE, payload);
  return data;
};

export const getClientUsers = async () => {
  const { data } = await api.get(BASE);
  return data.users || [];
};

export const getClientUser = async (userId) => {
  const { data } = await api.get(`${BASE}/${userId}`);
  return data.user;
};

// name, email and password are all optional. An unchanged password must be
// omitted entirely rather than sent empty.
export const updateClientUser = async (userId, payload) => {
  const { data } = await api.put(`${BASE}/${userId}`, payload);
  return data;
};

export const deleteClientUser = async (userId) => {
  const { data } = await api.delete(`${BASE}/${userId}`);
  return data;
};

export const assignProjectToUser = async (userId, projectId) => {
  const { data } = await api.post(`${BASE}/${userId}/projects/${projectId}`);
  return data;
};

// Soft removal: the backend sets isActive = false on the access record.
export const removeProjectAccess = async (userId, projectId) => {
  const { data } = await api.delete(`${BASE}/${userId}/projects/${projectId}`);
  return data;
};

export const getUserProjects = async (userId) => {
  const { data } = await api.get(`${BASE}/${userId}/projects`);
  return data.projects || [];
};
