import { Link } from "react-router-dom";
import { FiLock } from "react-icons/fi";

// Takes the place of a "New ..." button once the plan limit is reached.
const UpgradeButton = ({ resource, noun }) => (
  <Link
    to="/admin/billing"
    title={
      resource
        ? `You have used ${resource.used} of ${resource.limit} ${noun} on your plan`
        : undefined
    }
    className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
  >
    <FiLock size={16} /> Upgrade to add more
  </Link>
);

export default UpgradeButton;
