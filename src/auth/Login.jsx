import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell, { Alert, TextField, SubmitButton } from "./AuthShell";
import { login } from "../api/authApi";
import { getErrorMessage, getErrorStatus } from "../api/axios";
import { useAuth } from "./authContext";

const Login = () => {
  const navigate = useNavigate();
  const { saveUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      saveUser(data.user);
      
      navigate(data.redirectUrl || "/");
    } catch (err) {
      // Unverified account: finish OTP verification, then straight to the
      // dashboard. A fresh code is requested on the verify screen.
      if (getErrorStatus(err) === 403 && /verify/i.test(getErrorMessage(err))) {
        navigate("/auth/verify-email", {
          state: {
            email: form.email.trim(),
            sendOtp: true,
            notice: "Verify your email to finish signing in.",
          },
        });
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your dashboard."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/auth/register"
            className="font-medium text-indigo-600 hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={setField("email")}
          placeholder="you@company.com"
          autoComplete="email"
        />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={setField("password")}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <SubmitButton loading={loading}>Sign In</SubmitButton>
      </form>
    </AuthShell>
  );
};

export default Login;
