import { useEffect, useState } from "react";
import { getUsageDetails } from "../api/usageApi";

// A resource is full when it has a real limit and the backend's own count has
// reached it. Nothing is tallied on the page.
export const isLimitReached = (resource) =>
  Boolean(resource) &&
  !resource.unlimited &&
  resource.limit !== null &&
  resource.limit !== undefined &&
  Number(resource.used) >= Number(resource.limit);

// Plan usage for the create buttons. If it cannot be loaded the buttons stay
// as they are — the backend still refuses anything over the limit.
const usePlanUsage = () => {
  const [usage, setUsage] = useState(null);

  const reload = () =>
    getUsageDetails()
      .then(setUsage)
      .catch(() => setUsage(null));

  useEffect(() => {
    reload();
  }, []);

  return { resources: usage?.usage?.resources || {}, reload };
};

export default usePlanUsage;
