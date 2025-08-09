"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Check, X, ArrowLeft, ShieldCheck } from "lucide-react";
import { trpc } from "../../../../utils/providers/TrpcProviders";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FigmaBackground from "@/app/_components/figmabg";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [hasValidated, setHasValidated] = useState(false);

  const verifyPassTokenMutation = trpc.auth.verifyPassToken.useMutation();

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      setError("");
    },
    onError: (error: any) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    let isActive = true;

    async function validateToken() {
      if (!token || !emailParam) {
        setError(
          "Missing required parameters. Please use the link from your email."
        );
        setIsLoading(false);
        return;
      }

      if (hasValidated) return;

      setHasValidated(true);

      try {
        const decodedEmail = decodeURIComponent(emailParam);

        if (isActive) {
          setEmail(decodedEmail);
        }

        const result = await verifyPassTokenMutation.mutateAsync({
          email: decodedEmail,
          token: token,
        });

        if (isActive) {
          setIsTokenValid(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setError(
            "Invalid or expired token. Please request a new password reset link."
          );
          setIsTokenValid(false);
          setIsLoading(false);
        }
      }
    }

    if (isLoading) {
      validateToken();
    }

    return () => {
      isActive = false;
    };
  }, [token, emailParam]);

  const validatePassword = () => {
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return false;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }

    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        email,
        token: token || "",
        newPassword: password,
        confirmNewPassword: confirmPassword,
      });
    } catch (err) {}
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <FigmaBackground />
        </div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-xl">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-semibold text-blue-800">
                Verifying your reset link...
              </h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-50 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-gray-600 mb-6">
              {error ||
                "This password reset link is invalid or has expired. Please request a new one."}
            </p>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6"
              onClick={() => router.push("/auth/forgot-password")}
            >
              Request New Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <FigmaBackground />
        </div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Password Reset Complete
              </h2>
              <p className="text-gray-600 mb-6">
                Your password has been successfully updated. You can now log in
                with your new password.
              </p>
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6"
                onClick={() => router.push("/")}
              >
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <FigmaBackground />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-xl shadow-xl">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-blue-800">
                Reset Password
              </h1>
              <p className="text-blue-600 mt-1">
                Create a new secure password for {email}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full pr-10 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full pr-10 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600 mt-1">{passwordError}</p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-100">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md font-medium"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating Password...
                  </div>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Password must be at least 6 characters long.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
