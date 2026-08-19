import api from "./axios";

const BASE = "/forms/submissions";

// ADMIN only. tenantId is never sent: the backend takes it from req.user and
// validates that the form's project belongs to that tenant.
//
// NOTE: "get all" and "get one" share the same URL shape
// (/forms/submissions/:id), so the backend cannot tell a formId from a
// submissionId. The UI therefore opens a submission from the list it already
// has, rather than relying on getSubmission.
export const getSubmissions = async (formId) => {
  const { data } = await api.get(`${BASE}/${formId}`);
  return data.submissions || [];
};

export const getSubmission = async (submissionId) => {
  const { data } = await api.get(`${BASE}/${submissionId}`);
  return data.submission;
};

// Also decrements the form's submissionCount on the backend.
export const deleteSubmission = async (submissionId) => {
  const { data } = await api.delete(`${BASE}/${submissionId}`);
  return data;
};
