import api from "./axios";

// Plan shape: type FREE|PAID with billingCycle NONE|MONTHLY|YEARLY and a single
// price. storageLimit is MB on both sides — never convert to bytes here, and
// never send a razorpayPlanId: the backend owns those.
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

// Partial update. When the plan already has subscriptions the backend answers
// with a NEW plan and deactivates the old one, so always reload the list after.
export const updatePlan = async (planId, payload) => {
  const { data } = await api.put(`${BASE}/${planId}`, payload);
  return data;
};

// A plan in use is deactivated rather than deleted; the message says which.
export const deletePlan = async (planId) => {
  const { data } = await api.delete(`${BASE}/${planId}`);
  if (data.success === false) throw new Error(data.message);
  return data;
};
