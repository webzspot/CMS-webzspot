import api from "./axios";

const BASE = "/plans";

export const getPlans = async () => {
  const { data } = await api.get(BASE);
  return data.plans || [];
};

export const getPlan = async (planId) => {
  const { data } = await api.get(`${BASE}/${planId}`);
  return data.plan;
};

export const createPlan = async (payload) => {
  const { data } = await api.post(BASE, payload);
  return data;
};

export const updatePlan = async (planId, payload) => {
  const { data } = await api.put(`${BASE}/${planId}`, payload);
  return data;
};

export const deletePlan = async (planId) => {
  const { data } = await api.delete(`${BASE}/${planId}`);
  // The backend can answer 200 with success:false (plan in use by a subscription)
  if (data.success === false) throw new Error(data.message);
  return data;
};
