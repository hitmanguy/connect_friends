"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import "@/app/globals.css";
import { useEffect, useState } from "react";
import { trpc } from "../../utils/providers/TrpcProviders";
import Loading from "./loading";
import { redirect } from "next/navigation";
import FigmaBackground from "./_components/figmabg";
import { CharLimitInfo } from "./_components/char_limit";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ConnectFriend",
  description: "Connect with friends and family",
};

export default function Home() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [ErrorMessage, setErrorMessage] = useState<string | null>(null);

  const data = trpc.sampleProcedure.useQuery();
  const LoginData = trpc.auth.login.useMutation();
  const RegisterData = trpc.auth.register.useMutation();
  const oauthLogin = trpc.auth.oauthLogin.useMutation();
  const CurrentUser = trpc.auth.getCurrentUser.useQuery(
    {},
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      placeholderData: (prev) => prev,
      retry: false,
    }
  );

  const hostCountQ = trpc.user.hostCount.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const hostLimitReached = (hostCountQ.data?.count ?? 0) >= 1;

  useEffect(() => {
    if (LoginData.isError) {
      setErrorMessage(LoginData.error.message);
    }
    if (LoginData.isSuccess) {
      redirect(`/verify/${LoginData.data.token}`);
    }
  }, [LoginData.isError, LoginData.isSuccess, LoginData.error]);

  useEffect(() => {
    if (RegisterData.isError) {
      setErrorMessage(RegisterData.error.message);
    }
    if (RegisterData.isSuccess) {
      redirect(`/verify/${RegisterData.data.token}`);
    }
  }, [RegisterData.isError, RegisterData.isSuccess, RegisterData.error]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (ErrorMessage) {
      timeoutId = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [ErrorMessage]);

  useEffect(() => {
    if (CurrentUser.data) {
      redirect(`/${CurrentUser.data.role}`);
    }
  }, [CurrentUser.data]);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    LoginData.mutate({ email: loginForm.email, password: loginForm.password });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hostLimitReached) {
      setErrorMessage(
        "For personal use, the host limit for this website is only 1 and hence you can't register as host. For further concerns, contact at hitmanguy@gmail.com"
      );
      return;
    }
    RegisterData.mutate({
      username: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
    });
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await oauthLogin.mutateAsync({ provider: "google" });

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (error) {
      console.error("OAuth login error:", error);
      setErrorMessage("Failed to initialize Google login");
    }
  };
  const handleForgotPassword = () => {
    redirect("/auth/forgot-password");
  };

  if (data.isLoading || CurrentUser.isLoading) {
    return <Loading />;
  }

  return (
    <>
      <FigmaBackground />
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          {ErrorMessage && (
            <div
              className="bg-red-100 text-red-800 p-4 rounded-md mb-4 border-double border-2 border-red-200 transition-opacity duration-300 animate-fade-in"
              style={{
                animation: ErrorMessage
                  ? "fadeIn 0.3s, fadeOut 0.5s 4.5s"
                  : undefined,
              }}
            >
              <p>{ErrorMessage}</p>
            </div>
          )}
          <h1
            className="text-[clamp(2rem,5vw,4rem)] font-bold  mb-8 bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent animate-fade-slide-up"
            style={{
              textShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
              opacity: 0,
            }}
          >
            Connect Friend
          </h1>
          <Card
            className="w-[clamp(320px,80vw,450px)] animate-scale-in"
            style={{
              opacity: 0,
              animationDelay: "0.5s",
            }}
          >
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="text-blue-500">
                  {authMode === "login" ? "Log In" : "Host Registration"}
                </CardTitle>
                <div className="bg-slate-100 rounded-full p-1">
                  <Button
                    variant={authMode === "login" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full px-3 text-xs"
                    onClick={() => setAuthMode("login")}
                  >
                    Log In
                  </Button>
                  <Button
                    variant={authMode === "register" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full px-3 text-xs "
                    onClick={() => setAuthMode("register")}
                  >
                    Register
                  </Button>
                </div>
              </div>
              <CardDescription>
                {authMode === "login"
                  ? "Enter your credentials to continue"
                  : "Create a host account to invite friends"}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative overflow-hidden">
              {authMode === "login" ? (
                <form
                  onSubmit={handleLoginSubmit}
                  className={`space-y-4 transition-all duration-300 ${
                    authMode === "login"
                      ? "animate-slide-in-left"
                      : "absolute inset-0 opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      placeholder="your@email.com"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password">Password</Label>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-xs text-blue-500"
                        type="button"
                        onClick={() => {
                          handleForgotPassword();
                        }}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    Log In
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                    onClick={handleGoogleLogin}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </form>
              ) : (
                <div className="relative">
                  <form
                    onSubmit={handleRegisterSubmit}
                    className={`space-y-4 transition-all duration-300 ${
                      authMode === "register"
                        ? "animate-slide-in-right"
                        : "absolute inset-0 opacity-0 pointer-events-none"
                    } ${
                      hostLimitReached ? "opacity-60 pointer-events-none" : ""
                    }`}
                    aria-disabled={hostLimitReached}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={registerForm.name}
                        onChange={handleRegisterChange}
                        required
                        disabled={hostLimitReached}
                      />
                      <CharLimitInfo value={registerForm.name} limit={100} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="your@email.com"
                        value={registerForm.email}
                        onChange={handleRegisterChange}
                        required
                        disabled={hostLimitReached}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={registerForm.password}
                        onChange={handleRegisterChange}
                        required
                        disabled={hostLimitReached}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={registerForm.confirmPassword}
                        onChange={handleRegisterChange}
                        required
                        disabled={hostLimitReached}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-blue-500 hover:bg-blue-600"
                      disabled={hostLimitReached}
                    >
                      Create Host Account
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      After registration, you'll be able to invite friends
                    </p>
                  </form>

                  {hostLimitReached && (
                    <div className="host-block-overlay rounded-lg">
                      <div className="max-w-sm text-center rounded-xl border-2 border-red-300 bg-white/90 px-4 py-3 shadow-lg">
                        <p className="text-sm text-red-700 font-medium">
                          For personal use, the host limit for this website is
                          only 1 and hence you can’t register as host. For
                          further concerns, contact at hitmanguy@gmail.com
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <p className="text-sm text-slate-500">
                {authMode === "login"
                  ? "New here? Switch to Register to become a host"
                  : "Friends will join through your invitation link"}
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .host-block-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: grid;
          place-items: center;
          pointer-events: auto;
          background: repeating-linear-gradient(
            -45deg,
            rgba(239, 68, 68, 0.12) 0px,
            rgba(239, 68, 68, 0.12) 16px,
            rgba(239, 68, 68, 0.22) 16px,
            rgba(239, 68, 68, 0.22) 32px
          );
          animation: stripeMove 12s linear infinite;
          backdrop-filter: blur(1px);
        }
        .host-block-overlay::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(255, 255, 255, 0.9) 50%,
            transparent 100%
          );
          opacity: 0.18;
          animation: scan 3s linear infinite;
        }
        @keyframes stripeMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 200px 0;
          }
        }
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </>
  );
}
