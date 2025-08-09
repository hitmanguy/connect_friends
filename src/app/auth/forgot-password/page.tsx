"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "../../../../utils/providers/TrpcProviders";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FigmaBackground from "@/app/_components/figmabg";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const sendPassEmailMutation = trpc.auth.SendPassemail.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      setError("");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const baseurl = window.location.origin;

      await sendPassEmailMutation.mutateAsync({
        email: email.trim(),
        baseurl,
      });
    } catch (err) {}
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <FigmaBackground />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {!isSuccess ? (
            <div className="bg-white p-8 rounded-xl shadow-xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-blue-800">
                  Forgot Password
                </h1>
                <p className="text-blue-600 mt-1">
                  Enter your email to receive a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full border-blue-200 focus:border-blue-500 focus:ring-blue-500 py-5 sm:py-6"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md font-medium"
                  disabled={sendPassEmailMutation.isPending}
                >
                  {sendPassEmailMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending Email...
                    </div>
                  ) : (
                    "Send Reset Link"
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
          ) : (
            <div className="bg-white p-8 rounded-xl shadow-xl">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Check Your Email
                </h2>
                <p className="text-gray-600 mb-6">
                  We've sent a password reset link to{" "}
                  <span className="font-semibold text-blue-600">{email}</span>.
                  Please check your inbox and follow the instructions to reset
                  your password.
                </p>
                <div className="space-y-3 w-full">
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium"
                    onClick={() => router.push("/")}
                  >
                    Return to Login
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      setIsSuccess(false);
                      setEmail("");
                    }}
                  >
                    Try Different Email
                  </Button>
                </div>
                <p className="mt-6 text-xs text-gray-500">
                  If you don't receive an email within a few minutes, check your
                  spam folder or try again.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>We'll send a secure link to reset your password.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
