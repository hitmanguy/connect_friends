"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "../../../../utils/providers/TrpcProviders";
import { CheckCircle, AlertCircle, UserX, LogOut, Users } from "lucide-react";
import { CharLimitInfo } from "@/app/_components/char_limit";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const inviteQuery = trpc.auth.getInvitebyCode.useQuery({ code });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      console.log("Registration successful:", data);
      router.push(`/verify/${data.token}`);
    },
    onError: (error) => {
      console.error("Registration failed:", error);
    },
  });

  const CurrentUser = trpc.auth.getCurrentUser.useQuery(
    {},
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      placeholderData: (prev) => prev,
      retry: false,
    }
  );

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      console.log("Logout successful");
      window.location.reload();
    },
    onError: (error) => {
      console.error("Logout failed:", error);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    registerMutation.mutate({
      code: code,
      username: formData.name,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (inviteQuery.isLoading || CurrentUser.isLoading) {
    return (
      <div className="min-h-screen overflow-auto relative">
        <div
          className="fixed inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.15) 2px, transparent 2px)`,
            backgroundSize: "30px 30px",
            backgroundColor: "#f0f9ff",
            animation: "float 8s ease-in-out infinite",
          }}
        ></div>

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-3 h-3 bg-blue-300/20 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-32 w-4 h-4 bg-sky-300/20 rounded-full animate-bounce"></div>
          <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-indigo-300/20 rounded-full animate-ping"></div>
          <div className="absolute bottom-20 right-20 w-3 h-3 bg-blue-400/20 rounded-full animate-pulse"></div>
        </div>

        <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
          <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-xl">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-blue-800">
                    Loading invitation...
                  </h3>
                  <p className="text-sm text-blue-600">Please wait</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (inviteQuery.isError) {
    return (
      <div className="min-h-screen overflow-auto relative">
        <div
          className="fixed inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(239, 68, 68, 0.15) 2px, transparent 2px)`,
            backgroundSize: "30px 30px",
            backgroundColor: "#fef2f2",
          }}
        ></div>

        <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
          <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-red-800">
                    Invalid Invite
                  </h2>
                  <p className="text-red-600">{inviteQuery.error.message}</p>
                </div>
                <Button
                  onClick={() => router.push("/")}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                >
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const invite = inviteQuery.data?.invite;

  if (!invite) {
    return (
      <div className="min-h-screen overflow-auto relative">
        <div
          className="fixed inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(239, 68, 68, 0.15) 2px, transparent 2px)`,
            backgroundSize: "30px 30px",
            backgroundColor: "#fef2f2",
          }}
        ></div>

        <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
          <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-red-800">
                    Invite Not Found
                  </h2>
                  <p className="text-red-600">
                    This invite link is invalid or has been removed.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/")}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                >
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (CurrentUser.data?.role) {
    return (
      <div className="min-h-screen overflow-auto relative">
        <div
          className="fixed inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(251, 146, 60, 0.15) 2px, transparent 2px)`,
            backgroundSize: "30px 30px",
            backgroundColor: "#fff7ed",
          }}
        ></div>

        <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
          <Card className="w-full max-w-2xl bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-xl">
            <CardContent className="p-8 lg:p-12">
              <div className="text-center space-y-8">
                <UserX className="h-20 w-20 text-orange-500 mx-auto" />

                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-orange-800">
                    Already Logged In
                  </h2>
                  <p className="text-lg text-orange-700">
                    You're currently logged in as{" "}
                    <span className="font-semibold bg-orange-100 px-2 py-1 rounded">
                      {CurrentUser.data.role || CurrentUser.data.user.email}
                    </span>
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <p className="text-orange-800">
                    To accept this invite, please logout from your current
                    account first.
                  </p>
                </div>

                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-orange-900 flex items-center justify-center gap-2">
                      <Users className="h-5 w-5" />
                      Pending Invite
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 justify-center bg-white/60 rounded-lg p-3">
                      <span className="text-orange-800 font-medium">
                        Invited by: <strong>{invite.username}</strong>
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg"
                  >
                    {logoutMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Logging out...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout & Accept Invite
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => router.push("/user")}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 px-6 py-2 rounded-lg"
                  >
                    Go to Dashboard
                  </Button>
                </div>

                {logoutMutation.isError && (
                  <Alert
                    variant="destructive"
                    className="bg-red-50 border-red-200"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Logout failed: {logoutMutation.error.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-auto relative">
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(59, 130, 246, 0.2) 2px, transparent 2px)`,
          backgroundSize: "30px 30px",
          backgroundColor: "#f0f9ff",
          animation: "float 10s ease-in-out infinite",
        }}
      ></div>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-3 h-3 bg-blue-300/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-4 h-4 bg-sky-300/20 rounded-full animate-bounce"></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-indigo-300/20 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 right-20 w-3 h-3 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div
          className="absolute top-1/3 right-1/4 w-2 h-2 bg-cyan-300/20 rounded-full animate-bounce"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-blue-600">
              Connect Friends
            </h1>
            <p className="text-blue-700 text-lg">
              You've been invited to join!
            </p>
          </div>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Invited by</p>
                    <p className="font-semibold text-gray-800">
                      {invite.username}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-500 text-white px-2 py-1 text-xs rounded-full">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-xl overflow-hidden">
            <div className="flex">
              <div className="flex-1 bg-blue-600 text-white text-center py-3 px-4">
                <span className="font-medium">Create Account</span>
              </div>
            </div>

            <CardContent className="p-6">
              <p className="text-gray-600 text-center mb-6">
                Enter your details to continue
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-gray-700 text-sm">
                    Name / Username
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleInputChange}
                    maxLength={100}
                    required
                    className="h-10 border-gray-200 focus:border-blue-400 bg-white rounded-lg"
                  />
                  <CharLimitInfo value={formData.name} limit={100} />
                  <p className="text-xs text-gray-500">
                    Use a name the host can recognize
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-gray-700 text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="h-10 border-gray-200 focus:border-blue-400 bg-white rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-gray-700 text-sm">
                      Password
                    </Label>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="h-10 border-gray-200 focus:border-blue-400 bg-white rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-gray-700 text-sm"
                  >
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="h-10 border-gray-200 focus:border-blue-400 bg-white rounded-lg"
                  />
                  {formData.password !== formData.confirmPassword &&
                    formData.confirmPassword && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Passwords do not match
                      </p>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <Label
                    htmlFor="showPassword"
                    className="text-gray-700 text-sm"
                  >
                    Show passwords
                  </Label>
                </div>

                {registerMutation.isError && (
                  <Alert
                    variant="destructive"
                    className="bg-red-50 border-red-200"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {registerMutation.error.message}
                    </AlertDescription>
                  </Alert>
                )}

                {registerMutation.isSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Registration successful! Redirecting...
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  disabled={
                    registerMutation.isPending ||
                    formData.password !== formData.confirmPassword ||
                    !formData.name ||
                    !formData.email ||
                    !formData.password
                  }
                >
                  {registerMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <div className="text-center pt-4">
                  <p className="text-gray-600 text-sm">
                    Already have an account?{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-blue-600 hover:text-blue-800 font-medium"
                      onClick={() => router.push("/")}
                    >
                      Sign in here
                    </Button>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-gray-600 text-sm">
              Questions? Contact us at{" "}
              <span className="font-medium text-blue-600">
                hitmanguy1238@gmail.com
              </span>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .w-full.max-w-md {
          animation: fadeIn 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
