import api from "./axios";

const BASE = "/auth";

export const registerAdmin = async (payload) => {
  const { data } = await api.post(`${BASE}/admin/register`, payload);
  return data;
};

export const verifyEmail = async (email, otp) => {
  const { data } = await api.post(`${BASE}/verify-email`, { email, otp });
  return data;
};

export const resendOtp = async (email) => {
  const { data } = await api.post(`${BASE}/resend-otp`, { email });
  return data;
};

export const login = async (email, password) => {
  const { data } = await api.post(`${BASE}/login`, { email, password });
  return data;
};

export const logout = async () => {
  const { data } = await api.post(`${BASE}/logout`);
  return data;
};
