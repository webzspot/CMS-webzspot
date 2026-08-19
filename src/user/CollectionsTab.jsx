import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { FiDatabase, FiChevronRight, FiAlertCircle } from "react-icons/fi";
import { getCollections } from "../api/collectionApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import CopyEndpoint from "../components/CopyEndpoint";
import { publicCollection } from "../utils/publicApi";

const CollectionsTab = () => {
  const { projectId, project } = useOutletContext();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCollections = (id) =>
    getCollections(id)
      .then((data) => {
        setCollections(data);
        setError("");
      })
      .catch((err) =>
        setError(
          getErrorStatus(err) === 403
            ? "You do not have access to this project."
            : getErrorMessage(err),
        ),
      )
      .finally(() => setLoading(false));

  useEffect(() => {
    loadCollections(projectId);
  }, [projectId]);

  return (
    <div>
      <p className="text-sm text-slate-500">
        The content you can view and edit in this project.
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
            <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
            <FiDatabase className="mx-auto mb-3 text-slate-300" size={32} />
            <h3 className="font-medium text-slate-800">No collections yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              There is nothing to edit in this project right now.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => (
              <Link
                key={collection.collectionId}
                to={`/user/collections/${collection.collectionId}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 transition hover:border-indigo-200"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FiDatabase className="shrink-0 text-indigo-600" size={18} />
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
                      {collection.name}
                    </h3>
                    {/* Where this collection's content is served from */}
                    <CopyEndpoint
                      endpoint={publicCollection(project?.slug, collection.slug)}
                    />
                    <p className="mt-0.5 text-xs text-slate-400">
                      {collection.fields?.length ?? 0} field
                      {collection.fields?.length === 1 ? "" : "s"} ·{" "}
                      {collection._count?.records ?? 0} record
                      {collection._count?.records === 1 ? "" : "s"}
                    </p>
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

export default CollectionsTab;
