import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  FiCheck,
  FiCopy,
  FiLoader,
  FiRefreshCw,
  FiX,
  FiAlertTriangle,
  FiSend,
  FiZap,
  FiEdit2,
  FiClock,
  FiLock,
  FiExternalLink,
  FiChevronDown,
  FiKey,
} from "react-icons/fi";
import {
  getGatewayStatus,
  connectGateway,
  testWebhook,
  createTestOrder,
} from "../api/paymentGatewayApi";
import { getErrorMessage } from "../api/axios";
import { loadRazorpay } from "../utils/razorpay";

const DASHBOARD_URL = "https://dashboard.razorpay.com";

// /status carries the instructions once a gateway exists. Before that the
// response is empty, so the key steps fall back to the same wording.
const DEFAULT_KEY_STEPS = [
  "Login to your Razorpay Dashboard",
  "Go to Account & Settings > API Keys",
  "Generate a Test Key or Live Key",
  "Copy the Key ID and Key Secret",
  "Enter the credentials below",
];

// The backend's own status drives the page. A Checkout callback or a
// successful credential check never marks the gateway connected on its own.
const STATES = {
  WEBHOOK_PENDING: {
    label: "Credentials validated",
    detail: "Add the webhook below in your Razorpay dashboard.",
    tone: "amber",
    step: 1,
  },
  WEBHOOK_VERIFIED: {
    label: "Webhook verified",
    detail: "Make a ₹1 test payment to finish connecting.",
    tone: "indigo",
    step: 2,
  },
  TEST_PAYMENT_PENDING: {
    label: "Waiting for ₹1 test payment",
    detail: "Complete the payment; Razorpay confirms it to the server.",
    tone: "amber",
    step: 2,
  },
  CONNECTED: {
    label: "Connected",
    detail: "Razorpay is ready to take payments.",
    tone: "emerald",
    step: 3,
  },
  ERROR: {
    label: "Needs attention",
    detail: "Check your credentials and webhook, then try again.",
    tone: "red",
    step: 1,
  },
};

const NOT_CONNECTED = {
  label: "Not connected",
  detail: "Add your Razorpay keys to get started.",
  tone: "slate",
  step: 0,
};

const STEPS = ["Credentials", "Webhook", "₹1 test payment", "Connected"];

// The order the backend moves through. A step counts as done only once the
// status has reached the stage after it; ERROR is outside the order on purpose,
// so it unlocks nothing.
const STAGE_ORDER = [
  "NOT_CONNECTED",
  "WEBHOOK_PENDING",
  "WEBHOOK_VERIFIED",
  "TEST_PAYMENT_PENDING",
  "CONNECTED",
];

const TONES = {
  slate: "bg-slate-100 text-slate-600",
  amber: "bg-amber-50 text-amber-700",
  indigo: "bg-indigo-50 text-indigo-700",
  emerald: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
};

// Poll only while a test payment is waiting, and give up after a while.
const POLL_EVERY = 5000;
const POLL_LIMIT = 2 * 60 * 1000;

const modeOf = (keyId) =>
  keyId?.startsWith("rzp_live_")
    ? "Live mode"
    : keyId?.startsWith("rzp_test_")
      ? "Test mode"
      : null;

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-indigo-100 ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-slate-200 focus:border-indigo-500"
  }`;

const emptyForm = { keyId: "", keySecret: "", websiteUrl: "" };

// Date and time, for verification stamps where the hour matters.
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// One step of the setup. A numbered step stays locked until the one before it
// is verified, and shows a tick once it is done itself.
const Section = ({
  number,
  title,
  description,
  action,
  done,
  locked,
  lockedText,
  children,
}) => (
  <section
    className={`rounded-xl border bg-white transition ${
      locked ? "border-dashed border-slate-300" : "border-slate-200"
    }`}
  >
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
      <div className="flex items-start gap-3">
        {number && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              done
                ? "bg-emerald-50 text-emerald-700"
                : locked
                  ? "bg-slate-100 text-slate-400"
                  : "bg-indigo-600 text-white"
            }`}
          >
            {done ? <FiCheck size={14} /> : locked ? <FiLock size={13} /> : number}
          </span>
        )}
        <div className={locked ? "opacity-60" : ""}>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {done && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <FiCheck size={12} /> Verified
          </span>
        )}
        {!locked && action}
      </div>
    </div>
    <div className="px-6 py-5">
      {locked ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <FiLock size={14} /> {lockedText}
        </p>
      ) : (
        children
      )}
    </div>
  </section>
);

const Steps = ({ heading, items }) => (
  <div>
    <p className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
      {heading}
    </p>
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-sm text-slate-600">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  </div>
);

const Stepper = ({ current }) => (
  <ol className="grid gap-3 sm:grid-cols-4">
    {STEPS.map((label, index) => {
      const done = index < current || current === 3;
      const active = index === current && current !== 3;
      return (
        <li key={label} className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              done
                ? "bg-emerald-50 text-emerald-700"
                : active
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {done ? <FiCheck size={15} /> : index + 1}
          </span>
          <span
            className={`text-sm ${
              done || active ? "font-medium text-slate-800" : "text-slate-400"
            }`}
          >
            {label}
          </span>
        </li>
      );
    })}
  </ol>
);

// `wrap` shows the whole value instead of truncating it — for a secret the
// admin must be able to read in full.
const CopyField = ({ label, value, wrap = false }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <code
          className={`min-w-0 flex-1 font-mono text-sm text-indigo-600 ${
            wrap ? "break-all" : "truncate"
          }`}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          title={copied ? "Copied" : "Copy"}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {copied ? (
            <FiCheck size={13} className="text-emerald-600" />
          ) : (
            <FiCopy size={13} />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
};

// Shown once, straight after the credentials are saved. The secret lives only
// in this dialog's props: it is not stored, logged or shown again, so closing
// needs a deliberate "I've saved it".
const SecretDialog = ({ secret, webhookUrl, message, onDone }) => {
  const [saved, setSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <FiKey size={18} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Save your webhook details
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              You'll enter both in Razorpay when adding the webhook
              (Settings → Webhooks).
            </p>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Sent by the backend when Razorpay already has this webhook */}
          {message && (
            <div className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              <FiCheck className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <span>
              <strong>The secret is shown only this once.</strong> Copy it now
              and keep it somewhere safe — once you close this, it can't be seen
              again.
            </span>
          </div>

          {/* The URL stays visible on the page later; only the secret doesn't */}
          {webhookUrl && <CopyField label="Webhook URL" value={webhookUrl} />}
          <CopyField label="Webhook secret" value={secret} wrap />

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            I have copied and saved this secret
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">
            The page reloads when you click OK.
          </p>
          <button
            onClick={onDone}
            disabled={!saved}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// The secret's field name in the /config response isn't fixed in the docs,
// so the likely spellings are checked.
const secretFrom = (response) =>
  response?.webhookSecret ??
  response?.data?.webhookSecret ??
  response?.webhookSecretKey ??
  response?.data?.webhookSecretKey ??
  null;

// Lives as a tab inside a project: each project has its own gateway.
const PaymentGateway = () => {
  const { projectId, project } = useOutletContext();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ordering, setOrdering] = useState(false);

  // Only the public key id is remembered, for the Test/Live badge. It is
  // page state only — never the secret, never stored in the browser.
  const [knownKeyId, setKnownKeyId] = useState("");
  // Held only while the one-time dialog is open, then dropped.
  const [revealed, setRevealed] = useState(null); // { secret, webhookUrl }
  const [watching, setWatching] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const load = (id = projectId) =>
    getGatewayStatus(id)
      .then((data) => {
        setStatus(data);
        setError("");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const refresh = () => {
    setLoading(true);
    load();
  };

  // After a Checkout payment, check back until the webhook has confirmed it.
  useEffect(() => {
    if (!watching) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > POLL_LIMIT) {
        setWatching(false);
        setTimedOut(true);
        return;
      }
      getGatewayStatus(projectId)
        .then((data) => {
          setStatus(data);
          if (data?.connectionStatus !== "TEST_PAYMENT_PENDING") {
            setWatching(false);
            if (data?.connectionStatus === "CONNECTED") {
              setNotice({
                type: "success",
                text: "Test payment confirmed. Razorpay is connected.",
              });
            }
          }
        })
        .catch(() => {});
    }, POLL_EVERY);
    return () => clearInterval(timer);
  }, [watching, projectId]);

  // configured=false means nothing is set up for this project, whatever else
  // the response carries.
  const connection =
    status?.configured === false ? null : status?.connectionStatus;
  const state = STATES[connection] || NOT_CONNECTED;
  const mode = modeOf(knownKeyId);
  const keySteps = status?.keyInstructions?.length
    ? status.keyInstructions
    : DEFAULT_KEY_STEPS;

  // Steps unlock strictly one at a time, driven only by connectionStatus.
  // /status can return data (the instructions) before anything is set up, so
  // the mere presence of a response, or a leftover timestamp, must not count.
  const reached = (stage) => STAGE_ORDER.indexOf(connection) >= stage;
  const credentialsDone = reached(1); // WEBHOOK_PENDING or later
  const webhookDone = reached(2); // WEBHOOK_VERIFIED or later
  const paymentDone = reached(4); // CONNECTED

  // The form stays open until credentials are validated — including when the
  // status is NOT_CONNECTED or ERROR — and reopens on Edit.
  const showForm = editing || !credentialsDone;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const values = {
      keyId: form.keyId.trim(),
      keySecret: form.keySecret.trim(),
      websiteUrl: form.websiteUrl.trim(),
    };

    const errors = {};
    if (!values.keyId) errors.keyId = "Key ID is required";
    else if (!values.keyId.startsWith("rzp_")) {
      errors.keyId = "Razorpay key IDs start with rzp_test_ or rzp_live_";
    }
    if (!values.keySecret) errors.keySecret = "Key secret is required";
    if (!values.websiteUrl) errors.websiteUrl = "Website URL is required";
    else if (!/^https?:\/\/\S+$/i.test(values.websiteUrl)) {
      errors.websiteUrl = "Enter a full URL, e.g. https://example.com";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setNotice(null);
    try {
      const data = await connectGateway(projectId, values);
      setKnownKeyId(values.keyId);
      setForm(emptyForm); // the key secret leaves the page as soon as it is sent
      setEditing(false);
      setNotice({ type: "success", text: data.message || "Credentials validated." });

      // The secret is shown once now, for the admin to copy. When Razorpay
      // already has the webhook, the backend's message goes in the popup too,
      // so the admin knows they can go straight to Test Connection.
      const already =
        data?.data?.webhookAlreadyConfigured ?? data?.webhookAlreadyConfigured;
      const secret = secretFrom(data);
      if (secret) {
        setRevealed({
          secret,
          webhookUrl: data?.data?.webhookUrl ?? data?.webhookUrl ?? "",
          message: already ? data?.message : "",
        });
      }
      load();
    } catch (err) {
      // Keep the key id and URL so they can be corrected; drop the secret.
      setForm((prev) => ({ ...prev, keySecret: "" }));
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(emptyForm);
    setFormErrors({});
  };

  const runWebhookTest = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const data = await testWebhook(projectId);
      setNotice({
        type: data?.success === false ? "error" : "success",
        text: data.message || "Webhook checked.",
      });
      load();
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setTesting(false);
    }
  };

  const startTestPayment = async () => {
    setOrdering(true);
    setNotice(null);
    setTimedOut(false);
    try {
      const ready = await loadRazorpay();
      if (!ready) throw new Error("Could not load Razorpay Checkout.");

      const { data: order } = await createTestOrder(projectId);
      setKnownKeyId(order.keyId);
      load();

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "CMSX",
        description: "₹1 payment gateway test",
        theme: { color: "#000000" },
        // Not proof of payment: only the backend's webhook can confirm it, so
        // this just starts watching the status.
        handler: () => {
          setNotice({
            type: "success",
            text: "Payment submitted. Waiting for Razorpay to confirm it…",
          });
          setWatching(true);
        },
        modal: {
          ondismiss: () => {
            setNotice({ type: "error", text: "Test payment was not completed." });
            load();
          },
        },
      });
      checkout.open();
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err) });
    } finally {
      setOrdering(false);
    }
  };

  const primaryButton =
    "flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60";
  const outlineButton =
    "flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          Connect a Razorpay account to take payments for{" "}
          {project?.name ? (
            <span className="font-medium text-slate-700">{project.name}</span>
          ) : (
            "this project"
          )}
          . Each project has its own gateway.
        </p>
        <button
          onClick={refresh}
          title="Refresh"
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
        >
          <FiRefreshCw
            size={16}
            className={loading || watching ? "animate-spin" : ""}
          />
        </button>
      </div>

      {notice && (
        <div
          className={`mb-6 flex items-start justify-between gap-3 rounded-lg p-4 text-sm ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)}>
            <FiX size={16} />
          </button>
        </div>
      )}

      {loading && !status ? (
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-10 text-center">
          <FiAlertTriangle className="mx-auto mb-3 text-red-500" size={28} />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Provider and where the setup stands */}
          <Section
            title="Payment Gateway"
            description="Choose the payment provider to process transactions on your platform."
          >
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">
                    Payment provider
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONES[state.tone]}`}
                  >
                    {state.label}
                  </span>
                  {mode && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        mode === "Live mode" ? TONES.red : TONES.slate
                      }`}
                    >
                      {mode}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{state.detail}</p>
              </div>
              {/* Razorpay is the only provider the backend supports */}
              <div className="relative">
                <select
                  value="RAZORPAY"
                  disabled
                  className="appearance-none rounded-lg border border-slate-200 py-2 pr-9 pl-3 text-sm text-slate-800"
                >
                  <option value="RAZORPAY">Razorpay</option>
                </select>
                <FiChevronDown
                  className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400"
                  size={15}
                />
              </div>
            </div>

            <div className="mt-6">
              <Stepper current={state.step} />
            </div>
          </Section>

          {/* Step 1: credentials, with how to find them */}
          <Section
            number={1}
            done={credentialsDone}
            title="Razorpay Credentials"
            description="Enter your Razorpay Key ID and Key Secret to enable payments."
            action={
              credentialsDone &&
              !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
                >
                  <FiEdit2 size={14} /> Edit
                </button>
              )
            }
          >
            <Steps heading="How to get your keys" items={keySteps} />
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
            >
              Open Razorpay Dashboard <FiExternalLink size={13} />
            </a>

            {showForm && (
              <form
                onSubmit={submit}
                className="mt-6 border-t border-slate-100 pt-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Key ID
                    </label>
                    <input
                      value={form.keyId}
                      onChange={(e) => setField("keyId", e.target.value)}
                      placeholder="rzp_test_xxxxxxxx"
                      autoComplete="off"
                      spellCheck={false}
                      className={`${inputClass(formErrors.keyId)} font-mono`}
                    />
                    {formErrors.keyId && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.keyId}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Key secret
                    </label>
                    <input
                      type="password"
                      value={form.keySecret}
                      onChange={(e) => setField("keySecret", e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      spellCheck={false}
                      className={`${inputClass(formErrors.keySecret)} font-mono`}
                    />
                    {formErrors.keySecret ? (
                      <p className="mt-1 text-xs text-red-600">
                        {formErrors.keySecret}
                      </p>
                    ) : (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <FiLock size={11} /> Sent once and never shown again.
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Website URL
                    </label>
                    <input
                      value={form.websiteUrl}
                      onChange={(e) => setField("websiteUrl", e.target.value)}
                      placeholder="https://your-site.com"
                      autoComplete="url"
                      className={inputClass(formErrors.websiteUrl)}
                    />
                    {formErrors.websiteUrl && (
                      <p className="mt-1 text-xs text-red-600">
                        {formErrors.websiteUrl}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {credentialsDone && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" disabled={saving} className={primaryButton}>
                    {saving && <FiLoader className="animate-spin" />}
                    {saving ? "Checking with Razorpay…" : "Validate & save"}
                  </button>
                </div>
              </form>
            )}
          </Section>

          {/* Step 2: webhook — opens once the credentials are validated */}
          <Section
            number={2}
            done={webhookDone}
            locked={!credentialsDone}
            lockedText="Save and validate your Razorpay credentials to unlock webhook setup."
            title="Webhook Configuration"
            description="Add this webhook URL to your Razorpay dashboard to receive payment events."
          >
            {status?.webhookUrl ? (
              <CopyField label="Webhook URL" value={status.webhookUrl} />
            ) : (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                The webhook URL appears here once it has been generated.
              </p>
            )}

            {status?.webhookInstructions?.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <Steps
                  heading="Setup instructions"
                  items={status.webhookInstructions}
                />
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  <FiKey className="mt-0.5 shrink-0" />
                  The webhook secret was shown once, right after you saved your
                  credentials. Use the copy you saved then — it isn't shown here.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <p className="max-w-xl text-xs text-slate-400">
                {webhookDone
                  ? `Your webhook connection is verified. Last verified ${formatDateTime(status?.lastVerifiedAt)}.`
                  : "Add the webhook in Razorpay using the steps above, then use Test Connection to check Razorpay has it."}
              </p>
              {/* Once verified there is nothing left to test here */}
              {webhookDone ? (
                <button
                  disabled
                  className="flex cursor-default items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700"
                >
                  <FiCheck size={14} /> Verified
                </button>
              ) : (
                <button
                  onClick={runWebhookTest}
                  disabled={testing}
                  className={outlineButton}
                >
                  {testing ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiSend size={14} />
                  )}
                  Test Connection
                </button>
              )}
            </div>
          </Section>

          {/* Step 3: the real ₹1 payment — opens once the webhook is verified */}
          <Section
            number={3}
            done={paymentDone}
            locked={!webhookDone}
            lockedText="Verify your webhook connection to unlock the ₹1 test payment."
            title="₹1 Test Payment"
            description="A real ₹1.00 payment through Razorpay Checkout. Once Razorpay confirms it to the server, the gateway is marked connected."
          >
            {paymentDone ? (
              <dl className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Webhook verified", value: status?.webhookVerifiedAt },
                  {
                    label: "Last test payment",
                    value:
                      status?.lastTestPaymentVerifiedAt ?? status?.testPaymentAt,
                  },
                  { label: "Last verified", value: status?.lastVerifiedAt },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-4">
                    <dt className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-800">
                      {formatDateTime(item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                {watching ? (
                  <p className="flex items-center gap-2 text-sm text-amber-700">
                    <FiLoader className="animate-spin" /> Waiting for
                    confirmation…
                  </p>
                ) : timedOut ? (
                  <p className="flex items-start gap-2 text-sm text-slate-500">
                    <FiClock className="mt-0.5 shrink-0" />
                    No confirmation yet. It can take a little longer — use
                    Refresh to check again.
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    {connection === "TEST_PAYMENT_PENDING"
                      ? "A test order is open. Pay it to finish, or start a new one."
                      : "Your webhook is verified. Pay ₹1 to finish connecting."}
                  </p>
                )}

                {!watching && (
                  <button
                    onClick={startTestPayment}
                    disabled={ordering}
                    className={primaryButton}
                  >
                    {ordering ? (
                      <FiLoader className="animate-spin" />
                    ) : (
                      <FiZap size={14} />
                    )}
                    {connection === "TEST_PAYMENT_PENDING"
                      ? "Pay ₹1 again"
                      : "Pay ₹1"}
                  </button>
                )}
              </div>
            )}
          </Section>
        </div>
      )}

      {revealed && (
        <SecretDialog
          secret={revealed.secret}
          webhookUrl={revealed.webhookUrl}
          message={revealed.message}
          onDone={() => {
            setRevealed(null);
            // A full reload drops the /config response — and the secret in it —
            // from the browser's network log and memory. The page comes back on
            // the same tab and reloads the status from the server.
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default PaymentGateway;
