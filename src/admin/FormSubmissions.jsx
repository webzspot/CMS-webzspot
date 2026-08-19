import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { getForm } from "../api/formApi";
import SubmissionsPanel from "../components/SubmissionsPanel";

const FormSubmissions = () => {
  const { projectId, formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);

  useEffect(() => {
    getForm(formId)
      .then(setForm)
      .catch(() => setForm(null));
  }, [formId]);

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-slate-900">
                {form?.name || "Form"} submissions
              </h1>
              <p className="mt-1 truncate font-mono text-sm text-slate-400">
                POST /api/v1/forms/{form?.slug || formId}/submit
              </p>
            </div>
            <button
              onClick={() =>
                navigate(`/admin/projects/${projectId}/forms/${formId}`)
              }
              className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              <FiArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <SubmissionsPanel formId={formId} withFieldLabels />
      </div>
    </div>
  );
};

export default FormSubmissions;
