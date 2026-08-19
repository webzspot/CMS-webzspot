import { FiClock } from "react-icons/fi";

const TabPlaceholder = ({ title }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
    <FiClock className="mx-auto mb-3 text-slate-300" size={28} />
    <h3 className="font-medium text-slate-800">{title} coming soon</h3>
    <p className="mt-1 text-sm text-slate-500">
      This tab will be available once its API is ready.
    </p>
  </div>
);

export default TabPlaceholder;
