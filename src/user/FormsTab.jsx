import { Link, useOutletContext } from "react-router-dom";
import { FiFileText, FiChevronRight } from "react-icons/fi";
import StatusBadge from "../components/StatusBadge";
import CopyEndpoint from "../components/CopyEndpoint";
import { publicFormSubmit } from "../utils/publicApi";

// Forms arrive with the assigned-projects payload, so this tab needs no
// request of its own.
const FormsTab = () => {
  const { projectId, project, forms } = useOutletContext();

  return (
    <div>
      <p className="text-sm text-slate-500">
        Responses people have sent through your website forms.
      </p>

      <div className="mt-6">
        {forms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
            <FiFileText className="mx-auto mb-3 text-slate-300" size={32} />
            <h3 className="font-medium text-slate-800">No forms yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Your admin has not added a form to this project.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {forms.map((form) => (
              <Link
                key={form.formId}
                to={`/user/projects/${projectId}/forms/${form.formId}/submissions`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:border-indigo-200"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FiFileText className="shrink-0 text-indigo-600" size={18} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
                        {form.name}
                      </h3>
                      {form.status && <StatusBadge status={form.status} />}
                    </div>
                    {/* Where a website POSTs this form's submissions */}
                    <CopyEndpoint
                      endpoint={publicFormSubmit(project?.slug, form.slug)}
                    />
                  </div>
                </div>
                <FiChevronRight
                  className="shrink-0 text-slate-300 group-hover:text-indigo-500"
                  size={18}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormsTab;
