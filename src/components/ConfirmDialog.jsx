import { FiAlertCircle, FiLoader } from "react-icons/fi";

const ConfirmDialog = ({
  title,
  message,
  error,
  busy,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{message}</p>

      {error && (
        <div className="mt-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <FiAlertCircle className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-red-700 disabled:opacity-60"
        >
          {busy && <FiLoader className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
