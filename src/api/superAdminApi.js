import api from "./axios";

// Every route below is behind SUPER_ADMIN auth. The session cookie rides along
// on the shared axios instance, so nothing extra is sent here.
const BASE = "/super-admin/tenants";

export const getTenants = async () => {
  const { data } = await api.get(BASE);
  return data.tenants || [];
};

export const getTenant = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}`);
  return data.tenant;
};

export const getTenantAdmin = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}/admin`);
  return data.admin;
};

export const getTenantUsers = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}/users`);
  return data.users || [];
};

export const getTenantSubscription = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}/subscription`);
  return data.subscription;
};

export const getTenantSubscriptionHistory = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}/subscription-history`);
  return data.subscriptions || [];
};

export const getTenantPaymentHistory = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}/payment-history`);
  return data.payments || [];
};

export const getTenantUsage = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}/usage`);
  return data.usage;
};

export const getTenantProjects = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}/projects`);
  return data.projects || [];
};

export const getTenantForms = async (tenantId) => {
  const { data } = await api.get(`${BASE}/${tenantId}/forms`);
  return data.forms || [];
};

// Below the tenant every payload sits under `data`. Six lists paginate; the
// backend clamps limit to 1-100 and defaults to page 1, limit 25.
const ROOT = "/super-admin";

const paged = async (path, page = 1, limit = 10) => {
  const { data } = await api.get(`${ROOT}${path}`, { params: { page, limit } });
  return { rows: data.data || [], pagination: data.pagination || null };
};

export const getProject = async (projectId) => {
  const { data } = await api.get(`${ROOT}/projects/${projectId}`);
  return data.data;
};

export const getProjectCollections = (projectId, page) =>
  paged(`/projects/${projectId}/collections`, page);

export const getProjectForms = (projectId, page) =>
  paged(`/projects/${projectId}/forms`, page);

export const getCollection = async (collectionId) => {
  const { data } = await api.get(`${ROOT}/collections/${collectionId}`);
  return data.data;
};

// Fields come back whole; there is no pagination on them.
export const getCollectionFields = async (collectionId) => {
  const { data } = await api.get(`${ROOT}/collections/${collectionId}/fields`);
  return data.data || [];
};

export const getCollectionRecords = (collectionId, page) =>
  paged(`/collections/${collectionId}/records`, page);

// Media belonging to records inside the collection.
export const getCollectionMedia = (collectionId, page) =>
  paged(`/collections/${collectionId}/media`, page);

// The record arrives with its media embedded; there is no separate route.
export const getRecord = async (recordId) => {
  const { data } = await api.get(`${ROOT}/records/${recordId}`);
  return data.data;
};

export const getForm = async (formId) => {
  const { data } = await api.get(`${ROOT}/forms/${formId}`);
  return data.data;
};

export const getFormFields = async (formId) => {
  const { data } = await api.get(`${ROOT}/forms/${formId}/fields`);
  return data.data || [];
};

export const getFormSubmissions = (formId, page) =>
  paged(`/forms/${formId}/submissions`, page);

// Media belonging to submissions inside the form.
export const getFormMedia = (formId, page) =>
  paged(`/forms/${formId}/media`, page);

export const getSubmission = async (submissionId) => {
  const { data } = await api.get(`${ROOT}/submissions/${submissionId}`);
  return data.data;
};
