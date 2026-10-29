import { FiPaperclip } from "react-icons/fi";
import {
  getCollection,
  getCollectionFields,
  getCollectionRecords,
  getCollectionMedia,
  getForm,
  getFormFields,
  getFormSubmissions,
  getFormMedia,
} from "../api/superAdminApi";
import { formatLimit } from "../utils/planFormat";
import { dash, dateCell, summarise, rowNumber } from "./format";
import { useResource, usePagedList } from "./useSuperAdminData";
import useDrill from "./useDrill";
import {
  Table,
  Status,
  MediaGrid,
  PagedSection,
  PanelHeader,
  Skeleton,
  ErrorBox,
  NotFound,
} from "./Ui";

const cell = "px-5 py-3 text-slate-600";

// A collection and a form are the same panel: their fields, their paginated
// entries and their paginated media. Only endpoints and wording differ.
const KINDS = {
  collection: {
    fetch: getCollection,
    fetchFields: getCollectionFields,
    fetchEntries: getCollectionRecords,
    fetchMedia: getCollectionMedia,
    entries: { key: "records", label: "Records", noun: "record" },
    entryId: "recordId",
    backView: "collections",
    mediaEmpty: "No files attached to records in this collection.",
    fieldColumns: ["Field", "Slug", "Type", "Required", "Order"],
    renderField: (field) => (
      <tr key={field.fieldId} className="border-b border-slate-50 last:border-0">
        <td className="px-5 py-3 font-medium text-slate-800">{dash(field.name)}</td>
        <td className="px-5 py-3 font-mono text-xs text-slate-500">
          {dash(field.slug)}
        </td>
        <td className="px-5 py-3">
          <Status value={field.type} />
        </td>
        <td className={cell}>{field.isRequired ? "Required" : "Optional"}</td>
        <td className={cell}>{dash(field.displayOrder)}</td>
      </tr>
    ),
  },
  form: {
    fetch: getForm,
    fetchFields: getFormFields,
    fetchEntries: getFormSubmissions,
    fetchMedia: getFormMedia,
    entries: { key: "submissions", label: "Submissions", noun: "submission" },
    entryId: "submissionId",
    backView: "forms",
    mediaEmpty: "No files uploaded through this form.",
    fieldColumns: [
      "Field",
      "Label",
      "Type",
      "Required",
      "Placeholder",
      "Options",
      "Order",
    ],
    renderField: (field) => (
      <tr key={field.fieldId} className="border-b border-slate-50 last:border-0">
        <td className="px-5 py-3 font-mono text-xs text-slate-500">
          {dash(field.name)}
        </td>
        <td className="px-5 py-3 font-medium text-slate-800">{dash(field.label)}</td>
        <td className="px-5 py-3">
          <Status value={field.type} />
        </td>
        <td className={cell}>{field.isRequired ? "Required" : "Optional"}</td>
        <td className={`${cell} max-w-[12rem] truncate`}>
          {dash(field.placeholder)}
        </td>
        <td className={`${cell} max-w-[12rem] truncate`}>
          {field.options?.length ? field.options.join(", ") : "—"}
        </td>
        <td className={cell}>{dash(field.displayOrder)}</td>
      </tr>
    ),
  },
};

const ContainerPanel = ({ kind, id, nonce, onRetry }) => {
  const config = KINDS[kind];
  const drill = useDrill();

  const tabs = [
    { key: config.entries.key, label: config.entries.label },
    { key: "fields", label: "Fields" },
    { key: "media", label: "Media" },
  ];
  // Entries are what people come here for, so they open first.
  const view = tabs.some((tab) => tab.key === drill.view)
    ? drill.view
    : config.entries.key;

  const detail = useResource(config.fetch, id, nonce);
  // Fields are not paginated and come back whole.
  const fields = useResource(config.fetchFields, id, nonce);
  const entries = usePagedList(
    config.fetchEntries,
    id,
    drill.page,
    view === config.entries.key,
    nonce,
  );
  const media = usePagedList(
    config.fetchMedia,
    id,
    drill.page,
    view === "media",
    nonce,
  );

  const data = detail.data;
  const backToProject = () => drill.toProject(config.backView);

  if (detail.loading) return <Skeleton />;
  if (detail.notFound) {
    return (
      <NotFound message={detail.error} onBack={backToProject} backLabel="project" />
    );
  }
  if (detail.error) return <ErrorBox message={detail.error} onRetry={onRetry} />;

  return (
    <div>
      <PanelHeader
        crumbs={[
          { label: "All projects", onClick: drill.toProjects },
          { label: data?.project?.name || "Project", onClick: backToProject },
          { label: data?.name || config.entries.noun },
        ]}
        kind={kind}
        title={data?.name}
        status={data?.status}
        tabs={tabs}
        activeTab={view}
        onTab={drill.setView}
      />

      {view === "fields" ? (
        fields.loading ? (
          <Skeleton className="h-48" />
        ) : fields.error ? (
          <ErrorBox message={fields.error} onRetry={onRetry} />
        ) : (
          <Table
            columns={config.fieldColumns}
            rows={fields.data || []}
            empty={`This ${kind} has no fields.`}
            minWidth={kind === "form" ? 880 : 720}
            render={config.renderField}
          />
        )
      ) : view === "media" ? (
        <PagedSection list={media} onPage={drill.setPage} onRetry={onRetry}>
          <MediaGrid media={media.rows} empty={config.mediaEmpty} />
        </PagedSection>
      ) : (
        <PagedSection list={entries} onPage={drill.setPage} onRetry={onRetry}>
          {/* Every value shows in the row itself; files are on the Media tab. */}
          <Table
            columns={["#", "Data", "Files", "Created"]}
            rows={entries.rows}
            empty={`No ${config.entries.noun}s yet.`}
            render={(entry, index) => (
              <tr
                key={entry[config.entryId]}
                className="border-b border-slate-50 last:border-0 align-top"
              >
                <td className="px-5 py-3 text-slate-400">
                  {rowNumber(entries.pagination, index)}
                </td>
                <td className="px-5 py-3 break-words text-slate-700">
                  {summarise(entry.data, Infinity, Infinity)}
                </td>
                <td className={cell}>
                  <span className="inline-flex items-center gap-1.5">
                    <FiPaperclip size={13} className="text-slate-400" />
                    {formatLimit(entry._count?.media ?? 0)}
                  </span>
                </td>
                <td className={`${cell} whitespace-nowrap`}>
                  {dateCell(entry.createdAt)}
                </td>
              </tr>
            )}
          />
        </PagedSection>
      )}
    </div>
  );
};

export default ContainerPanel;
