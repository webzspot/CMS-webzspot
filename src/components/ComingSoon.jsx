import { FiClock } from "react-icons/fi";
import PageShell from "./PageShell";

const ComingSoon = ({ title }) => (
  <PageShell title={title}>
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
      <FiClock className="mx-auto mb-3 text-slate-300" size={32} />
      <h3 className="font-medium text-slate-800">Coming soon</h3>
      <p className="mt-1 text-sm text-slate-500">
        This module will be available once its API is ready.
      </p>
    </div>
  </PageShell>
);

export default ComingSoon;
