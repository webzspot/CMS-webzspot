import api from "./axios";

// USER-only endpoint. The backend resolves userId, tenantId and role from the
// auth cookie and filters by UserProjectAccess, so nothing is sent here: no
// body, no query, no userId/tenantId/role.
//
// If the backend mounts this router under a prefix, add it to this one path.
const MY_PROJECTS = "admin/assigned/user/projects";

export const getMyProjects = async () => {
  const { data } = await api.get(MY_PROJECTS);
  return data.projects || [];
};

// Each assigned project carries its forms, so the USER portal never needs the
// admin-only /forms/projects/:projectId route to find a formId.
export const getMyProject = async (projectId) => {
  const projects = await getMyProjects();
  return projects.find((project) => project.projectId === projectId) || null;
};

// The payload names the array `form`; `forms` is accepted in case that changes.
export const formsOf = (project) => project?.form || project?.forms || [];

export const getMyForms = async (projectId) => {
  const project = await getMyProject(projectId);
  return formsOf(project);
};
