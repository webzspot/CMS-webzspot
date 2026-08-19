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
export const upgradeSubscription = async ({
  tenantId,
  planId,
  billingCycle,
}) => {
  const { data } = await api.post(`${BASE}/upgrade`, {
    tenantId,
    planId,
    billingCycle,
  });
  return data;
};
