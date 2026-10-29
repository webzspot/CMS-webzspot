import { useSearchParams } from "react-router-dom";

// Where the Projects tab has been drilled to, kept in the URL so a refresh
// returns to the same spot and the browser Back button walks back up.
//   ?tab=projects&project=<id>&collection=<id>&view=records&page=2
const DRILL_KEYS = ["project", "collection", "form", "view", "page"];

export const clearDrill = (params) => {
  DRILL_KEYS.forEach((key) => params.delete(key));
  return params;
};

const useDrill = () => {
  const [params, setParams] = useSearchParams();
  const get = (key) => params.get(key) || "";

  // Moving between levels pushes history; switching a sub-tab or page within
  // a level replaces it, so Back skips straight to the previous level.
  const go = (changes, push = false) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next, { replace: !push });
  };

  const fresh = { collection: null, form: null, view: null, page: null };

  return {
    project: get("project"),
    collection: get("collection"),
    form: get("form"),
    view: get("view"),
    page: Math.max(1, Number(params.get("page")) || 1),

    openProject: (id) => go({ ...fresh, project: id }, true),
    openCollection: (id) => go({ ...fresh, collection: id }, true),
    openForm: (id) => go({ ...fresh, form: id }, true),
    toProjects: () => go({ ...fresh, project: null }, true),
    // Back to the project on the list the user came from
    toProject: (view) => go({ ...fresh, view }, true),

    setView: (key) => go({ view: key, page: null }),
    setPage: (value) => go({ page: value > 1 ? value : null }),
  };
};

export default useDrill;
