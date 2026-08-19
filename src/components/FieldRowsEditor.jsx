import { useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiX,
  FiCircle,
  FiSquare,
  FiList,
} from "react-icons/fi";
import { FORM_FIELD_TYPES, typeUsesOptions } from "../api/formFieldApi";
import { snakify } from "../utils/slug";
import { emptyFieldRow } from "../utils/formFieldRows";

const cellClass =
  "rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

// Each choice type gets the control it will actually render as, so the list
// reads the way it will look on the published form.
const CHOICE_STYLE = {
  RADIO: { icon: FiCircle, hint: "People pick one of these." },
  SELECT: { icon: FiList, hint: "People pick one from a dropdown." },
  CHECKBOX: { icon: FiSquare, hint: "People can tick any of these." },
  MULTI_SELECT: { icon: FiSquare, hint: "People can pick more than one." },
};

const OptionsEditor = ({ type, value, onChange }) => {
  const [draft, setDraft] = useState("");
  const options = value.split("\n").filter(Boolean);
  const { icon: Icon, hint } = CHOICE_STYLE[type] || CHOICE_STYLE.SELECT;

  const commit = (next) => onChange(next.join("\n"));

  const addOption = () => {
    const text = draft.trim();
    if (!text || options.includes(text)) {
      setDraft("");
      return;
    }
    commit([...options, text]);
    setDraft("");
  };

  const removeOption = (index) =>
    commit(options.filter((_, i) => i !== index));

  return (
    <div className="mt-2 ml-1 rounded-lg border border-slate-200 bg-slate-100 p-3">
      <p className="mb-2 text-xs font-medium text-slate-500">Choices</p>

      {options.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {options.map((option, index) => (
            <span
              key={option}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
            >
              <Icon size={11} className="text-indigo-600" />
              {option}
              <button
                type="button"
                onClick={() => removeOption(index)}
                title={`Remove ${option}`}
                className="text-slate-400 transition hover:text-red-600"
              >
                <FiX size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds a choice; it must not submit the whole dialog
            if (e.key === "Enter") {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder="Type a choice, then press Enter"
          className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={addOption}
          disabled={!draft.trim()}
          className="shrink-0 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {hint}
        {options.length === 0 && " Add at least one."}
      </p>
    </div>
  );
};

// One line per field: key, label, placeholder, type, required, reorder, remove.
const FieldRowsEditor = ({ rows, onChange }) => {
  const setRow = (index, changes) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));

  const addRow = () => onChange([...rows, emptyFieldRow()]);

  const removeRow = (index) => onChange(rows.filter((_, i) => i !== index));

  const moveRow = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Fields</h3>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
        >
          <FiPlus size={15} /> Add
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index}>
            <div className="flex items-center gap-2">
              <input
                value={row.name}
                onChange={(e) =>
                  setRow(index, { name: e.target.value, nameTouched: true })
                }
                placeholder="name"
                className={`${cellClass} w-32 shrink-0 font-mono`}
              />
              <input
                value={row.label}
                onChange={(e) =>
                  setRow(index, {
                    label: e.target.value,
                    // Key follows the label until it is edited by hand
                    name: row.nameTouched ? row.name : snakify(e.target.value),
                  })
                }
                placeholder="Label"
                className={`${cellClass} min-w-0 flex-1`}
              />
              <input
                value={row.placeholder}
                onChange={(e) => setRow(index, { placeholder: e.target.value })}
                placeholder="Placeholder"
                className={`${cellClass} min-w-0 flex-1`}
              />
              <select
                value={row.type}
                onChange={(e) => setRow(index, { type: e.target.value })}
                className={`${cellClass} w-32 shrink-0`}
              >
                {FORM_FIELD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.value.toLowerCase()}
                  </option>
                ))}
              </select>
              <label className="flex shrink-0 items-center gap-1.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={row.required}
                  onChange={(e) => setRow(index, { required: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                req
              </label>
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => moveRow(index, -1)}
                  disabled={index === 0}
                  title="Move up"
                  className="rounded px-1 text-slate-400 transition hover:text-indigo-600 disabled:opacity-25 disabled:hover:text-slate-400"
                >
                  <FiChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(index, 1)}
                  disabled={index === rows.length - 1}
                  title="Move down"
                  className="rounded px-1 text-slate-400 transition hover:text-indigo-600 disabled:opacity-25 disabled:hover:text-slate-400"
                >
                  <FiChevronDown size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                title="Remove field"
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <FiTrash2 size={15} />
              </button>
            </div>

            {typeUsesOptions(row.type) && (
              <OptionsEditor
                type={row.type}
                value={row.options}
                onChange={(options) => setRow(index, { options })}
              />
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Leave a row blank to skip it.
      </p>
    </div>
  );
};

export default FieldRowsEditor;
