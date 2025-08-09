"use client";

import Link from "next/link";
import FigmaBackground from "./_components/figmabg";

export default function NotFound() {
  return (
    <>
      <FigmaBackground />
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="relative w-full max-w-2xl">
          {/* soft glow blobs */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-sky-300/40 blur-3xl" />

          <div className="relative overflow-hidden rounded-2xl border border-blue-100/60 bg-white/85 backdrop-blur-xl shadow-xl">
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 shadow-sm">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  className="opacity-90"
                >
                  <path
                    d="M12 2v2M12 20v2M2 12h2M20 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                </svg>
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-sky-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">
                404
              </h1>
              <p className="mt-2 text-lg font-semibold text-slate-800">
                Oops, that page wandered off.
              </p>
              <p className="mt-1 text-slate-600">
                The link might be broken or the page may have been moved.
              </p>
            </div>

            <div className="px-8 pb-8">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-200/70 to-transparent" />
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium shadow hover:bg-blue-700 transition-colors"
                >
                  Go Home
                </Link>
                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-blue-700 font-medium shadow-sm hover:bg-blue-50 transition-colors"
                >
                  Go Back
                </button>
                <a
                  href="mailto:hitmanguy@gmail.com?subject=Missing%20page%20report"
                  className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-blue-700 font-medium shadow-sm hover:bg-blue-50 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>

            <div className="relative h-1 overflow-hidden rounded-b-2xl">
              <div className="absolute inset-0 -translate-x-full animate-[marquee_6s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.35),transparent)]" />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
