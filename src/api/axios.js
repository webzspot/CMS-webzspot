import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // the auth token lives in an http-only cookie
});

// Every API error looks like { success: false, message: "..." }
export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

export const getErrorStatus = (error) => error?.response?.status;

export const getErrorData = (error) => error?.response?.data || {};

export default api;
