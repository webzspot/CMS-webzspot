import api from "./axios";

// Each project has its own gateway. The tenant still comes from the signed-in
// admin on the server, so only the project is in the path — never a tenantId.
const base = (projectId) => `/tenant/payment-gateway/projects/${projectId}`;

// May come back with configured=false (or no data) before anything is set up.
export const getGatewayStatus = async (projectId) => {
  const { data } = await api.get(`${base(projectId)}/status`);
  return data.data || null;
};

// The key secret is sent once and goes nowhere else: it is not kept in state
// after this call, not logged, and never returned by the backend. The response
// carries the webhook URL and secret, which the caller shows once.
export const connectGateway = async (projectId, { keyId, keySecret, websiteUrl }) => {
  const { data } = await api.post(`${base(projectId)}/config`, {
    provider: "RAZORPAY",
    keyId,
    keySecret,
    websiteUrl,
  });
  return data;
};

// Checks whether the webhook URL has been added in the Razorpay dashboard.
export const testWebhook = async (projectId) => {
  const { data } = await api.post(`${base(projectId)}/test`);
  return data;
};

// A real ₹1 order (amount is in paise) to pay through Checkout.
export const createTestOrder = async (projectId) => {
  const { data } = await api.post(`${base(projectId)}/test-order`);
  return data;
};
