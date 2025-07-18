"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FigmaBackground from '../../_components/figmabg';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Separate useEffect for navigation
  useEffect(() => {
    if (countdown <= 0) {
      router.push('/');
    }
  }, [countdown, router]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleRetry = () => {
    reset();
  };

  return (
    <>
      <FigmaBackground />
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          
          {/* Header with Connect Friends branding */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-blue-600 mb-2">Connect Friends</h2>
            <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg 
                className="w-6 h-6 text-red-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01" 
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Verification Error
            </h1>
          </div>

          {/* Error Details - Main Focus */}
          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-red-800">
                  {error.message || "Verification failed"}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    We encountered an issue while verifying your account. This could be due to:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Invalid or expired verification token</li>
                    <li>Network connectivity issues</li>
                    <li>Server temporarily unavailable</li>
                  </ul>
                </div>
                {error.digest && (
                  <div className="mt-3 text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
                    Error ID: {error.digest}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Return Home
            </button>
          </div>

          {/* Subtle countdown and support info */}
          <div className="text-center border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500 mb-2">
              Automatically redirecting to home in <span className="font-semibold text-gray-700">{countdown}s</span>
            </p>
            <p className="text-xs text-gray-400">
              Need help? Contact support for assistance.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}