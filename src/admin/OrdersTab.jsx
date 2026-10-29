import { useEffect, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  FiShoppingBag,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiPackage,
  FiCreditCard,
  FiCopy,
  FiCheck,
  FiCalendar,
} from "react-icons/fi";
import { getProjectOrders } from "../api/orderApi";
import { getErrorMessage } from "../api/axios";
import { formatDate, formatPrice } from "../utils/planFormat";

const PAGE_SIZES = [10, 25, 50, 100]; // the backend caps limit at 100

// ---- Reading an order -------------------------------------------------------
// The customer sits in customerSnapshot.customerData, whose keys are whatever
// the storefront form used ("Name", "city", "ProductName"…). Keys are matched
// case- and separator-insensitively so "Name", "name" and "full_name" all work.

const norm = (key) => String(key).toLowerCase().replace(/[\s_-]/g, "");

const CANDIDATES = {
  name: ["name", "customername", "fullname", "firstname"],
  email: ["email", "emailaddress", "mail"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "contact"],
  address: ["address", "street", "addressline1", "addressline"],
  city: ["city", "town"],
  state: ["state", "region", "province"],
  pincode: ["pincode", "pin", "zip", "zipcode", "postalcode", "postcode"],
  country: ["country"],
  product: ["productname", "product", "item", "itemname", "title"],
};
// The order's own amount is the price of record, so a price the form also
// captured isn't repeated under "More details".
const PRICE_KEYS = ["finalpricenumber", "finalprice", "price", "amount", "total"];
const USED = new Set([...Object.values(CANDIDATES).flat(), ...PRICE_KEYS]);

const fieldOf = (data, names) => {
  const map = Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [norm(key), value]),
  );
  for (const name of names) {
    const value = map[name];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

// customerSnapshot may arrive as an object or as a JSON string.
const snapshotOf = (order) => {
  const raw = order?.customerSnapshot;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const customerOf = (order) => {
  const data = snapshotOf(order).customerData || {};
  const get = (key) => fieldOf(data, CANDIDATES[key]);
  return {
    data,
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    address: get("address"),
    city: get("city"),
    state: get("state"),
    pincode: get("pincode"),
    country: get("country"),
    product: get("product"),
    // Anything the form collected that isn't shown above and isn't an id,
    // so no customer detail is ever hidden.
    extra: Object.entries(data).filter(
      ([key]) => !USED.has(norm(key)) && !/id$/i.test(key),
    ),
  };
};

const pick = (record, keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

const money = (amount, currency) => {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = formatPrice(amount);
  return !currency || currency === "INR" ? `₹${value}` : `${value} ${currency}`;
};

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// "finalpricenumber" -> "Finalpricenumber", "deliveryNote" -> "Delivery Note"
const labelOf = (key) =>
  String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

const show = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const shortId = (id) => (id ? `…${String(id).slice(-8)}` : "—");

// ---- Small pieces -----------------------------------------------------------

const Status = ({ value }) => {
  const upper = String(value || "").toUpperCase();
  const tone = ["PAID", "SUCCESS", "CAPTURED", "COMPLETED", "CONFIRMED", "DELIVERED"].includes(
    upper,
  )
    ? "bg-emerald-50 text-emerald-700"
    : ["PENDING", "CREATED", "AUTHORIZED", "PROCESSING", "SHIPPED"].includes(upper)
      ? "bg-amber-50 text-amber-700"
      : ["FAILED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(upper)
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${tone}`}
    >
      {value || "—"}
    </span>
  );
};

const CopyText = ({ value }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-slate-400">—</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="truncate font-mono text-xs text-slate-600">{value}</span>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied" : "Copy"}
        className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        {copied ? <FiCheck size={12} className="text-emerald-600" /> : <FiCopy size={12} />}
      </button>
    </span>
  );
};

const Card = ({ icon: Icon, title, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5">
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon size={15} />
      </span>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
    </div>
    {children}
  </div>
);

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
    <span className="shrink-0 text-slate-400">{label}</span>
    <span className="min-w-0 text-right break-words text-slate-800">{children}</span>
  </div>
);

const Line = ({ icon: Icon, children }) =>
  children ? (
    <p className="flex items-start gap-2.5 text-sm text-slate-700">
      <Icon size={14} className="mt-0.5 shrink-0 text-slate-400" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  ) : null;

// ---- The expanded order -----------------------------------------------------

const OrderDetails = ({ order, customer, payments }) => {
  const address = [customer.address, customer.city, customer.state, customer.pincode, customer.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card icon={FiUser} title="Customer">
          <div className="space-y-2.5">
            <p className="text-base font-semibold text-slate-900">
              {customer.name || "Unnamed customer"}
            </p>
            <Line icon={FiMail}>
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="hover:underline">
                  {customer.email}
                </a>
              )}
            </Line>
            <Line icon={FiPhone}>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {String(customer.phone)}
                </a>
              )}
            </Line>
            <Line icon={FiMapPin}>{address}</Line>
            {!customer.email && !customer.phone && !address && (
              <p className="text-sm text-slate-400">No contact details captured.</p>
            )}
          </div>
        </Card>

        <Card icon={FiPackage} title="Order">
          {customer.product && (
            <p className="mb-2 text-base font-semibold text-slate-900">{customer.product}</p>
          )}
          <div className="divide-y divide-slate-100">
            <Row label="Amount">
              <span className="font-semibold">
                {money(pick(order, ["amount", "totalAmount", "total"]), order.currency)}
              </span>
            </Row>
            <Row label="Status">
              <Status value={pick(order, ["status", "orderStatus"])} />
            </Row>
            <Row label="Order ID">
              <CopyText value={pick(order, ["orderId", "id"])} />
            </Row>
            <Row label="Placed">{dateTime(order.createdAt)}</Row>
            {order.updatedAt && order.updatedAt !== order.createdAt && (
              <Row label="Updated">{dateTime(order.updatedAt)}</Row>
            )}
          </div>
        </Card>

        <Card icon={FiCreditCard} title={payments.length > 1 ? `Payments (${payments.length})` : "Payment"}>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-400">No payment recorded for this order.</p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <div
                  key={pick(payment, ["paymentId", "id"]) ?? index}
                  className={`divide-y divide-slate-100 ${
                    index > 0 ? "border-t border-slate-200 pt-4" : ""
                  }`}
                >
                  <Row label="Status">
                    <Status value={pick(payment, ["status", "paymentStatus"])} />
                  </Row>
                  {pick(payment, ["amount"]) != null && (
                    <Row label="Amount">
                      {money(payment.amount, payment.currency || order.currency)}
                    </Row>
                  )}
                  {pick(payment, ["method", "paymentMethod"]) && (
                    <Row label="Method">{show(pick(payment, ["method", "paymentMethod"]))}</Row>
                  )}
                  {pick(payment, ["razorpayPaymentId", "providerPaymentId"]) && (
                    <Row label="Payment ID">
                      <CopyText value={pick(payment, ["razorpayPaymentId", "providerPaymentId"])} />
                    </Row>
                  )}
                  {pick(payment, ["razorpayOrderId", "providerOrderId"]) && (
                    <Row label="Gateway order">
                      <CopyText value={pick(payment, ["razorpayOrderId", "providerOrderId"])} />
                    </Row>
                  )}
                  <Row label="Paid">
                    {dateTime(pick(payment, ["paidAt", "capturedAt", "createdAt"]))}
                  </Row>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Whatever else the storefront form collected */}
      {customer.extra.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            More details from the customer
          </p>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {customer.extra.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="text-xs text-slate-400">{labelOf(key)}</dt>
                <dd className="mt-0.5 text-sm break-words text-slate-800">{show(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};

// ---- The tab ----------------------------------------------------------------

const OrdersTab = () => {
  const { projectId, project } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const listTop = useRef(null);

  // Page and size live in the URL, so a refresh keeps your place.
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = PAGE_SIZES.includes(Number(params.get("limit")))
    ? Number(params.get("limit"))
    : 10;

  const [nonce, setNonce] = useState(0);
  const [open, setOpen] = useState(null);

  // Which request the state belongs to, so loading is derived rather than set
  // inside the effect, and a slow old page can't overwrite a newer one.
  const key = `${projectId}:${page}:${limit}:${nonce}`;
  const [state, setState] = useState({ key: null, rows: [], pagination: null, error: "" });

  useEffect(() => {
    let live = true;
    getProjectOrders(projectId, page, limit)
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
  }, [key, projectId, page, limit]);

  const loading = state.key !== key;
  // Rows from another project are never shown while the new ones load.
  const sameProject = state.key?.startsWith(`${projectId}:`);
  const rows = sameProject ? state.rows : [];
  const pagination = sameProject ? state.pagination : null;

  const totalPages = Number(pagination?.totalPages) || 1;
  const currentPage = Number(pagination?.currentPage) || page;
  const total = pagination?.totalOrders;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([name, value]) => next.set(name, value));
    setParams(next, { replace: true });
  };

  const goToPage = (value) => {
    setOpen(null);
    update({ page: value });
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // A new page size always starts again from page 1.
  const changeLimit = (value) => {
    setOpen(null);
    update({ limit: value, page: 1 });
  };

  const refresh = () => setNonce((value) => value + 1);

  return (
    <div ref={listTop}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Orders</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Placed through{" "}
            {project?.name ? (
              <span className="font-medium text-slate-700">{project.name}</span>
            ) : (
              "this project"
            )}
            , newest first
            {total != null && ` · ${formatPrice(total)} in total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Show
            <select
              value={limit}
              onChange={(e) => changeLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={refresh}
            title="Refresh"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : state.error && state.key === key ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
          <FiAlertCircle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-sm text-red-700">{state.error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
          <FiShoppingBag className="mx-auto mb-3 text-slate-300" size={30} />
          <h3 className="font-medium text-slate-800">No orders found for this project.</h3>
          <p className="mt-1 text-sm text-slate-500">
            Orders appear here once customers buy through your website.
          </p>
        </div>
      ) : (
        <>
          <div className={`space-y-3 transition ${loading ? "opacity-60" : ""}`}>
            {rows.map((order, index) => {
              const id = pick(order, ["orderId", "id"]) ?? index;
              const customer = customerOf(order);
              const payments = Array.isArray(order.payments) ? order.payments : [];
              // Newest payment first, if they carry a date
              const latest = [...payments].sort(
                (a, b) =>
                  new Date(b?.createdAt || 0).getTime() -
                  new Date(a?.createdAt || 0).getTime(),
              )[0];
              const expanded = open === id;

              return (
                <div
                  key={id}
                  className={`overflow-hidden rounded-xl border bg-white transition ${
                    expanded ? "border-indigo-200" : "border-slate-200"
                  }`}
                >
                  {/* Summary row: who, what, how much, where it stands */}
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : id)}
                    className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 text-left transition hover:bg-slate-50/60"
                  >
                    <span className="w-6 shrink-0 text-sm text-slate-400">
                      {(currentPage - 1) * limit + index + 1}
                    </span>

                    <span className="flex min-w-[12rem] flex-1 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                        {(customer.name || "?").toString().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">
                          {customer.name || "Unnamed customer"}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {customer.email || (customer.phone ? String(customer.phone) : "")}
                        </span>
                      </span>
                    </span>

                    <span className="min-w-[10rem] flex-1">
                      <span className="block truncate text-sm text-slate-800">
                        {customer.product || "Order"}
                      </span>
                      <span className="block font-mono text-xs text-slate-400">
                        {shortId(pick(order, ["orderId", "id"]))}
                      </span>
                    </span>

                    <span className="w-24 shrink-0 text-base font-semibold text-slate-900">
                      {money(pick(order, ["amount", "totalAmount", "total"]), order.currency)}
                    </span>

                    <span className="flex w-52 shrink-0 flex-wrap items-center gap-2">
                      <Status value={pick(order, ["status", "orderStatus"])} />
                      {latest ? (
                        <Status value={pick(latest, ["status", "paymentStatus"])} />
                      ) : (
                        <span className="text-xs text-slate-400">No payment</span>
                      )}
                    </span>

                    <span className="flex w-28 shrink-0 items-center gap-1.5 text-sm text-slate-500">
                      <FiCalendar size={13} className="text-slate-400" />
                      {order.createdAt ? formatDate(order.createdAt) : "—"}
                    </span>

                    <FiChevronDown
                      size={18}
                      className={`ml-auto shrink-0 text-slate-400 transition ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                      <OrderDetails
                        order={order}
                        customer={customer}
                        payments={payments}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Built from the backend's pagination, never the array length */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm">
              <p className="text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiChevronLeft size={14} /> Previous
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrdersTab;
