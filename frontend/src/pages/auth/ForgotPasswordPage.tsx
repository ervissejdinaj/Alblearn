import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../services/alblearnApi";
import { ApiError } from "../../services/apiClient";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      await authApi.forgotPassword({ email });
      setStatus("success");
      setMessage(
        "If an account exists for that email, we’ve sent password reset instructions."
      );
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("We couldn’t start the reset process. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the email address linked to your AlbLearn account.
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
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              className="input-field mt-1"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full disabled:opacity-60"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Sending..." : "Send reset link"}
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

export default ForgotPasswordPage;
