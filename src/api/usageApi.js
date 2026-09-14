import api from "./axios";

// The backend takes tenantId from req.user, so nothing is sent: no path
// parameter, no body, no query.
export const getUsageDetails = async () => {
  const { data } = await api.get("/usage/details");
  return data;
};
