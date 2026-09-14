import api from "./axios";

const BASE = "/subscriptions";

// The auth token is an http-only cookie, so it rides along via
// withCredentials on the axios instance. No Bearer header is possible.
export const getCurrentSubscription = async (tenantId) => {
  const { data } = await api.get(`${BASE}/current/${tenantId}`);
  return data.subscription;
};

export const getAvailablePlans = async () => {
  const { data } = await api.get(`${BASE}/plans`);
  return data.plans || [];
};

// The upgrade controller reads tenantId from req.body. The backend works out
// the amount to pay and creates the Razorpay subscription, so never calculate
// or override that amount here.
// 200 starts a real upgrade; 201 with "You are currently on the maximum plan."
// means there is nothing above the current plan, so the status code rides along
// with the body — the caller has to read both.
// The plan itself carries the billing cycle, so planId is all the backend
// needs. It works out the amount; nothing about the price is sent from here.
export const upgradeSubscription = async ({ tenantId, planId }) => {
  const response = await api.post(`${BASE}/upgrade`, { tenantId, planId });
  return { ...response.data, httpStatus: response.status };
};

// There is no verification call from the browser: Razorpay's webhook tells the
// backend when a payment succeeded. The frontend only re-reads the subscription
// afterwards to see what the backend now holds.
