import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell, { Alert, TextField, SubmitButton } from "./AuthShell";
import { registerAdmin, resendOtp } from "../api/authApi";
import { getErrorData, getErrorMessage, getErrorStatus } from "../api/axios";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  companyName: "",
};

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setFormError("");
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.email.trim()) next.email = "Email is required";
    if (!form.companyName.trim()) next.companyName = "Company name is required";
    if (!form.password) next.password = "Password is required";
    if (form.password && form.password !== form.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // The email is taken. If that account was never verified, send them to
  // finish the OTP rather than blocking them; if it is verified, they should
  // sign in instead. resend-otp is what tells the two apart.
  const handleExistingEmail = async (email) => {
    try {
      const data = await resendOtp(email);
      navigate("/auth/verify-email", {
        state: {
          email,
          notice:
            data.message ||
            "This email is already registered but not verified. We've sent a new code.",
        },
      });
    } catch (err) {
      const { retryAfter } = getErrorData(err);
      if (retryAfter) {
        // A code went out moments ago, so the account is still unverified
        navigate("/auth/verify-email", {
          state: { email, retryAfter, notice: getErrorMessage(err) },
        });
        return;
      }
      setErrors((prev) => ({
        ...prev,
        email: "This email is already registered. Sign in instead.",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // confirmPassword is a UI-only check, it is never sent to the backend
      await registerAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        companyName: form.companyName.trim(),
      });
      navigate("/auth/verify-email", { state: { email: form.email.trim() } });
    } catch (err) {
      if (getErrorStatus(err) === 409) {
        await handleExistingEmail(form.email.trim());
        return;
      }
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Register as an admin and set up your company workspace."
      footer={
        <>
          Already registered?{" "}
          <Link
            to="/auth/login"
            className="font-medium text-indigo-600 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <Alert>{formError}</Alert>
        <TextField
          label="Full Name"
          value={form.name}
          onChange={setField("name")}
          error={errors.name}
          placeholder="John Doe"
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={setField("email")}
          error={errors.email}
          placeholder="john@example.com"
          autoComplete="email"
        />
        <TextField
          label="Company Name"
          value={form.companyName}
          onChange={setField("companyName")}
          error={errors.companyName}
          placeholder="ABC Technologies"
        />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={setField("password")}
          error={errors.password}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <TextField
          label="Confirm Password"
          type="password"
          value={form.confirmPassword}
          onChange={setField("confirmPassword")}
          error={errors.confirmPassword}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <SubmitButton loading={loading}>Create Account</SubmitButton>
      </form>
    </AuthShell>
  );
};

export default Register;
