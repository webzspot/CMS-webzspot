import api from "./axios";

// The route is /order/:projectId, but the backend guide notes the controller
// may still read projectId from the query string. Sending it in both places
// works either way until the two are aligned. limit is capped at 100 there.
export const getProjectOrders = async (projectId, page = 1, limit = 10) => {
  const { data } = await api.get(`/order/${encodeURIComponent(projectId)}`, {
    params: { page, limit, projectId },
  });
  if (data?.success === false) {
    throw new Error(data.message || "Unable to fetch orders");
  }
  return { rows: data.data || [], pagination: data.pagination || null };
};
