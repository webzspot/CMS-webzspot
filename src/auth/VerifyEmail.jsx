import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthShell, { Alert, SubmitButton } from "./AuthShell";
import { verifyEmail, resendOtp } from "../api/authApi";
import { getErrorData, getErrorMessage } from "../api/axios";
import { useAuth } from "./authContext";

const OTP_LENGTH = 6;
const OTP_TTL = 10 * 60; // backend expires the OTP after 10 minutes
const RESEND_WAIT = 60; // backend rate limit

const formatTime = (seconds) => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveUser } = useAuth();

  // Email is passed from register/login; sessionStorage keeps it across refresh.
  const [email] = useState(
    () => location.state?.email || sessionStorage.getItem("cmsx_pending_email"),
  );

  const inputsRef = useRef([]);
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(OTP_TTL);
  const [resendIn, setResendIn] = useState(RESEND_WAIT);

  useEffect(() => {
    if (email) sessionStorage.setItem("cmsx_pending_email", email);
  }, [email]);

  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresIn((value) => (value > 0 ? value - 1 : 0));
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!email) return <Navigate to="/auth/register" replace />;

  const focusInput = (index) => inputsRef.current[index]?.focus();

  const handleDigit = (index, value) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === index ? "" : d)));
      return;
    }
    // Support pasting the whole code into any box
    const chars = clean.split("").slice(0, OTP_LENGTH - index);
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((char, offset) => {
        next[index + offset] = char;
      });
      return next;
    });
    focusInput(Math.min(index + chars.length, OTP_LENGTH - 1));
    setError("");
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const otp = digits.join("");
    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await verifyEmail(email, otp);
      sessionStorage.removeItem("cmsx_pending_email");
      saveUser(data.user);
      navigate(data.redirectUrl || "/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    try {
      const data = await resendOtp(email);
      setSuccess(data.message || "OTP resent successfully");
      setResendIn(RESEND_WAIT);
      setExpiresIn(OTP_TTL);
      setDigits(Array(OTP_LENGTH).fill(""));
    } catch (err) {
      // 429 tells us exactly how long to wait
      const { retryAfter } = getErrorData(err);
      if (retryAfter) setResendIn(retryAfter);
      setError(getErrorMessage(err));
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`We've sent a 6-digit OTP to ${email}`}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <Alert type="success">{success}</Alert>

        <div className="mb-4 flex justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              value={digit}
              onChange={(e) => handleDigit(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              autoFocus={index === 0}
              className="h-12 w-full rounded-lg border border-slate-200 text-center text-lg font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          ))}
        </div>

        <p className="mb-4 text-center text-sm text-slate-500">
          {expiresIn > 0 ? (
            <>OTP expires in {formatTime(expiresIn)}</>
          ) : (
            <span className="text-red-600">
              OTP expired. Please resend a new one.
            </span>
          )}
        </p>

        <SubmitButton loading={loading}>Verify</SubmitButton>

        <div className="mt-5 text-center text-sm text-slate-500">
          Didn&apos;t receive the OTP?{" "}
          {resendIn > 0 ? (
            <span className="text-slate-400">Resend OTP in {resendIn}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="font-medium text-indigo-600 hover:underline"
            >
              Resend OTP
            </button>
          )}
        </div>
      </form>
    </AuthShell>
  );
};

export default VerifyEmail;
