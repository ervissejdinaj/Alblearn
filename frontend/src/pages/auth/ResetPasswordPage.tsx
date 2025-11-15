import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../services/alblearnApi";
import { ApiError } from "../../services/apiClient";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [formData, setFormData] = useState({
    email: emailFromUrl,
    token: tokenFromUrl,
    password: "",
    confirmPassword: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      await authApi.resetPassword({
        token: formData.token,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      });
      setStatus("success");
      setMessage("Your password has been reset. You can now sign in.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("We couldn’t reset your password. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Choose a new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the code from your email along with your new password.
          </p>
        </div>

        {message && (
          <div
            className={
              status === "success"
                ? "bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded"
                : "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
            }
          >
            {message}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="token">
                Reset token
              </label>
              <input
                id="token"
                name="token"
                type="text"
                required
                className="input-field mt-1"
                value={formData.token}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field mt-1"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field mt-1"
                minLength={6}
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="input-field mt-1"
                minLength={6}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full disabled:opacity-60"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          <Link to="/login" className="text-primary-600 hover:text-primary-500">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
