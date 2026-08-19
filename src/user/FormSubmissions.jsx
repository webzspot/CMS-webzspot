import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import PageShell from "../components/PageShell";
import SubmissionsPanel from "../components/SubmissionsPanel";
import { getMyForms } from "../api/userApi";

const UserFormSubmissions = () => {
  const { projectId, formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);

  useEffect(() => {
    // The form's details come from the assigned-projects payload; reading the
    // form directly is an admin-only route.
    getMyForms(projectId)
      .then((forms) => setForm(forms.find((f) => f.formId === formId) || null))
      .catch(() => setForm(null));
  }, [projectId, formId]);

  return (
    <PageShell
      title={form?.name ? `${form.name} submissions` : "Submissions"}
      subtitle="Responses people have sent through this form."
      actions={
        <button
          onClick={() => navigate(`/user/projects/${projectId}`)}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          <FiArrowLeft size={16} /> Back
        </button>
      }
    >
      <SubmissionsPanel formId={formId} />
    </PageShell>
  );
};

export default UserFormSubmissions;
