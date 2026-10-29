import {
  getProject,
  getProjectCollections,
  getProjectForms,
} from "../api/superAdminApi";
import { formatLimit } from "../utils/planFormat";
import { dateCell } from "./format";
import { useResource, usePagedList } from "./useSuperAdminData";
import useDrill from "./useDrill";
import ContainerPanel from "./ContainerPanel";
import {
  Table,
  Status,
  OpenButton,
  PagedSection,
  PanelHeader,
  Skeleton,
  ErrorBox,
  NotFound,
} from "./Ui";

const cell = "px-5 py-3 text-slate-600";

const NameCell = ({ name, slug }) => (
  <td className="px-5 py-3">
    <p className="font-medium text-slate-800">{name}</p>
    <p className="truncate font-mono text-xs text-slate-400">{slug}</p>
  </td>
);

const PROJECT_TABS = [
  { key: "collections", label: "Collections" },
  { key: "forms", label: "Forms" },
];

// One project: its collections and forms, each paginated and each loaded only
// while its sub-tab is open.
const ProjectPanel = ({ projectId, nonce, onRetry }) => {
  const drill = useDrill();
  const view = drill.view === "forms" ? "forms" : "collections";

  const project = useResource(getProject, projectId, nonce);
  const collections = usePagedList(
    getProjectCollections,
    projectId,
    drill.page,
    view === "collections",
    nonce,
  );
  const forms = usePagedList(
    getProjectForms,
    projectId,
    drill.page,
    view === "forms",
    nonce,
  );

  if (project.loading) return <Skeleton />;
  if (project.notFound) {
    return (
      <NotFound
        message={project.error}
        onBack={drill.toProjects}
        backLabel="projects"
      />
    );
  }
  if (project.error) return <ErrorBox message={project.error} onRetry={onRetry} />;

  const data = project.data;

  return (
    <div>
      <PanelHeader
        crumbs={[
          { label: "All projects", onClick: drill.toProjects },
          { label: data?.name || "Project" },
        ]}
        kind="project"
        title={data?.name}
        status={data ? (data.isActive ? "ACTIVE" : "INACTIVE") : null}
        tabs={PROJECT_TABS}
        activeTab={view}
        onTab={drill.setView}
      />

      {view === "collections" ? (
        <PagedSection list={collections} onPage={drill.setPage} onRetry={onRetry}>
          <Table
            columns={["Collection", "Status", "Fields", "Records", "Created", ""]}
            rows={collections.rows}
            empty="This project has no collections."
            render={(item) => (
              <tr
                key={item.collectionId}
                className="border-b border-slate-50 last:border-0"
              >
                <NameCell name={item.name} slug={item.slug} />
                <td className="px-5 py-3">
                  <Status value={item.status} />
                </td>
                <td className={cell}>{formatLimit(item._count?.fields ?? 0)}</td>
                <td className={cell}>{formatLimit(item._count?.records ?? 0)}</td>
                <td className={cell}>{dateCell(item.createdAt)}</td>
                <td className="px-5 py-3 text-right">
                  <OpenButton onClick={() => drill.openCollection(item.collectionId)} />
                </td>
              </tr>
            )}
          />
        </PagedSection>
      ) : (
        <PagedSection list={forms} onPage={drill.setPage} onRetry={onRetry}>
          <Table
            columns={["Form", "Status", "Fields", "Submissions", "Created", ""]}
            rows={forms.rows}
            empty="This project has no forms."
            render={(item) => (
              <tr
                key={item.formId}
                className="border-b border-slate-50 last:border-0"
              >
                <NameCell name={item.name} slug={item.slug} />
                <td className="px-5 py-3">
                  <Status value={item.status} />
                </td>
                <td className={cell}>{formatLimit(item._count?.fields ?? 0)}</td>
                <td className={cell}>
                  {formatLimit(item._count?.submissions ?? 0)}
                </td>
                <td className={cell}>{dateCell(item.createdAt)}</td>
                <td className="px-5 py-3 text-right">
                  <OpenButton onClick={() => drill.openForm(item.formId)} />
                </td>
              </tr>
            )}
          />
        </PagedSection>
      )}
    </div>
  );
};

// The tenant's Projects tab. Opening something drills in place, under the
// tenant header, rather than moving to a separate page.
const ProjectBrowser = ({ projects, nonce, onRetry }) => {
  const drill = useDrill();

  if (drill.collection) {
    return (
      <ContainerPanel
        kind="collection"
        id={drill.collection}
        nonce={nonce}
        onRetry={onRetry}
      />
    );
  }
  if (drill.form) {
    return (
      <ContainerPanel kind="form" id={drill.form} nonce={nonce} onRetry={onRetry} />
    );
  }
  if (drill.project) {
    return (
      <ProjectPanel projectId={drill.project} nonce={nonce} onRetry={onRetry} />
    );
  }

  return (
    <Table
      columns={["Project", "Collections", "API keys", "Forms", "Status", "Created", ""]}
      rows={projects}
      empty="This tenant has no projects yet."
      render={(project) => (
        <tr key={project.projectId} className="border-b border-slate-50 last:border-0">
          <NameCell name={project.name} slug={project.slug} />
          <td className={cell}>{formatLimit(project._count?.collections ?? 0)}</td>
          <td className={cell}>{formatLimit(project._count?.apiKeys ?? 0)}</td>
          <td className={cell}>{formatLimit(project._count?.form ?? 0)}</td>
          <td className="px-5 py-3">
            <Status value={project.isActive ? "ACTIVE" : "INACTIVE"} />
          </td>
          <td className={cell}>{dateCell(project.createdAt)}</td>
          <td className="px-5 py-3 text-right">
            <OpenButton onClick={() => drill.openProject(project.projectId)} />
          </td>
        </tr>
      )}
    />
  );
};

export default ProjectBrowser;
