"use client";
import { useState, useRef, useEffect } from "react";
import { notFound, redirect, useParams } from "next/navigation";
import { trpc } from "../../../../utils/providers/TrpcProviders";
import Loading from "./loading";
import FigmaBackground from "../../_components/figmabg";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Account",
  description: "Verify your account using the OTP sent to your email",
};

export default function VerifyPage() {
  const params = useParams();
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [resendAvailable, setResendAvailable] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const verifyID = trpc.auth.verifyToken.useQuery(
    {
      token: params?.id as string,
    },
    {
      enabled: !!params?.id,
    }
  );
  const sendOTP = trpc.auth.sendVerificationEmail.useMutation();
  const verifyOTP = trpc.auth.verifyUser.useMutation();

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendAvailable(true);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (verifyID.data?.user?.email && !verifyID.isLoading) {
      sendOTP.mutate({ email: verifyID.data.user.email.toLowerCase() });
    }
  }, [verifyID.data?.user?.email, verifyID.isLoading]);

  if (verifyID.isLoading) {
    return <Loading />;
  }

  if (verifyID.isError || !verifyID.isSuccess) {
    notFound();
  }

  const email = verifyID.data.user.email;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text/plain").trim();

    if (!/^\d+$/.test(pasteData)) return;

    const otpArray = pasteData.slice(0, 6).split("");
    const newOtp = [...otp];

    otpArray.forEach((digit, index) => {
      if (index < 6) newOtp[index] = digit;
    });

    setOtp(newOtp);

    const lastFilledIndex = Math.min(otpArray.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await verifyOTP.mutateAsync({
        email: email.toLowerCase(),
        otp: otpString,
      });

      setSuccess(true);

      setTimeout(() => {
        window.location.href = `/${response.user.role}`;
      }, 1500);
    } catch (err) {
      setError("Invalid verification code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!resendAvailable) return;

    try {
      await sendOTP.mutateAsync({ email: email.toLowerCase() });

      setResendTimer(60);
      setResendAvailable(false);
    } catch (err) {
      setError("Failed to resend code. Please try again later.");
    }
  };

  return (
    <>
      <FigmaBackground />
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              Verify Your Account
            </h1>
            <p className="text-gray-600 mt-2">
              We've sent a verification code to
              <br />
              <span className="font-medium">
                {email || "your email address"}
              </span>
            </p>
          </div>

          {/* OTP Input Fields */}
          <div className="flex justify-center space-x-3 mb-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-center">
              Verification successful! Redirecting...
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={verifying || success}
            className={`w-full py-3 rounded-lg font-medium text-white ${
              verifying || success
                ? "bg-blue-300"
                : "bg-blue-600 hover:bg-blue-700"
            } transition-colors duration-300`}
          >
            {verifying ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Verifying...
              </span>
            ) : success ? (
              "Verified!"
            ) : (
              "Verify"
            )}
          </button>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Didn't receive a code?{" "}
              <button
                onClick={handleResendOtp}
                disabled={!resendAvailable}
                className={`font-medium ${
                  resendAvailable
                    ? "text-blue-600 hover:text-blue-800"
                    : "text-gray-400"
                } transition-colors`}
              >
                {resendAvailable ? "Resend code" : `Resend in ${resendTimer}s`}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
