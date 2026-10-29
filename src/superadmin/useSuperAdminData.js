import { useEffect, useState } from "react";
import { getErrorMessage, getErrorStatus } from "../api/axios";

// Loading is worked out by comparing which request the state belongs to with
// the one currently wanted, so nothing is set synchronously inside an effect
// and a slow response for an old page can never overwrite a newer one.

// One object or list, fetched once per id (and again when `nonce` changes).
export const useResource = (fetcher, id, nonce = 0) => {
  const key = id ? `${id}:${nonce}` : null;
  const [state, setState] = useState({ key: null, data: null, error: "", status: null });

  useEffect(() => {
    if (!key) return;
    let live = true;
    fetcher(id)
      .then((data) => live && setState({ key, data, error: "", status: 200 }))
      .catch(
        (err) =>
          live &&
          setState({
            key,
            data: null,
            error: getErrorMessage(err),
            status: getErrorStatus(err),
          }),
      );
    return () => {
      live = false;
    };
  }, [key, fetcher, id]);

  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : "",
    notFound: state.key === key && state.status === 404,
    loading: Boolean(key) && state.key !== key,
  };
};

// A paginated list. Only fetches while `enabled`, so a tab that is not open
// costs nothing.
export const usePagedList = (fetcher, id, page, enabled, nonce = 0) => {
  const key = enabled && id ? `${id}:${page}:${nonce}` : null;
  const [state, setState] = useState({ key: null, rows: [], pagination: null, error: "" });

  useEffect(() => {
    if (!key) return;
    let live = true;
    fetcher(id, page)
      .then(
        (data) =>
          live &&
          setState({ key, rows: data.rows, pagination: data.pagination, error: "" }),
      )
      .catch(
        (err) =>
          live &&
          setState({ key, rows: [], pagination: null, error: getErrorMessage(err) }),
      );
    return () => {
      live = false;
    };
  }, [key, fetcher, id, page]);

  const current = state.key === key;
  return {
    rows: current ? state.rows : [],
    pagination: current ? state.pagination : null,
    error: current ? state.error : "",
    loading: Boolean(key) && !current,
  };
};
