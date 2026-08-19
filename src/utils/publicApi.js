// The public API a customer's website calls. Every route needs an API key
// created under the project's API Keys tab.
//
// Verified against the backend:
//   GET  /api/v1/public/:projectSlug/:collectionSlug        collection content
//   GET  /api/v1/public/:projectSlug/forms/:formSlug        form definition
//   POST /api/v1/public/:projectSlug/forms/:formSlug/submit form submission

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// Absolute, so what is copied can be pasted straight into a website.
const origin = API_BASE.startsWith("http")
  ? API_BASE
  : `${window.location.origin}${API_BASE}`;

const publicPath = (path) => `/api/v1/public${path}`;

// Both slugs are required. Returning null when the project has not loaded yet
// keeps a half-built URL like /public/undefined/posts off the screen.
export const publicCollection = (projectSlug, collectionSlug) => {
  if (!projectSlug || !collectionSlug) return null;
  return {
    method: "GET",
    path: publicPath(`/${projectSlug}/${collectionSlug}`),
    url: `${origin}/public/${projectSlug}/${collectionSlug}`,
  };
};

export const publicFormSubmit = (projectSlug, formSlug) => {
  if (!projectSlug || !formSlug) return null;
  return {
    method: "POST",
    path: publicPath(`/${projectSlug}/forms/${formSlug}/submit`),
    url: `${origin}/public/${projectSlug}/forms/${formSlug}/submit`,
  };
};
