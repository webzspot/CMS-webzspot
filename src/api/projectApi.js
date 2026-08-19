import api from "./axios";

const BASE = "/projects";

// The backend reads tenantId from req.user (authentication middleware)
// so we don't need to send it in the request anymore
export const getProjects = async () => {
  const { data } = await api.get(BASE);
  return data.projects || [];
};

export const getProject = async (projectId) => {
  const { data } = await api.get(`${BASE}/${projectId}`);
  return data.project;
};

export const createProject = async (payload) => {
  const { data } = await api.post(BASE, payload);
  return data;
};

export const updateProject = async (projectId, payload) => {
  const { data } = await api.put(`${BASE}/${projectId}`, payload);
  return data;
};

export const deleteProject = async (projectId) => {
  const { data } = await api.delete(`${BASE}/${projectId}`);
  return data;
};