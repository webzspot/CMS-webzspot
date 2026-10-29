import api from "./axios";

// The backend reads tenantId from req.user, so nothing is sent: no path
// parameter, no query, no body. An admin cannot ask for another tenant's data.
const BASE = "/tenant";

export const getSubscriptionHistory = async () => {
  const { data } = await api.get(`${BASE}/subscription-history`);
  return data.subscriptions || [];
};

export const getPaymentHistory = async () => {
  const { data } = await api.get(`${BASE}/payment-history`);
  return data.payments || [];
};
