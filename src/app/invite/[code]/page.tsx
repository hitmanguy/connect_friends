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
import { Link, CheckCircle, AlertCircle, UserX, LogOut } from "lucide-react";

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
      // Refetch current user to update the state
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
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading invite...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (inviteQuery.isError) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-50 to-rose-100 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-red-800 mb-2">
                  Invalid Invite
                </h2>
                <p className="text-red-600">{inviteQuery.error.message}</p>
                <Button
                  onClick={() => router.push("/")}
                  className="mt-4"
                  variant="outline"
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
      <div className="fixed inset-0 bg-gradient-to-br from-red-50 to-rose-100 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-red-800 mb-2">
                  Invite Not Found
                </h2>
                <p className="text-red-600">
                  This invite link is invalid or has been removed.
                </p>
                <Button
                  onClick={() => router.push("/")}
                  className="mt-4"
                  variant="outline"
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

  console.log(CurrentUser.data?.user);
  console.log("hello");

  if (CurrentUser.data?.role) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 to-amber-100 overflow-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <UserX className="h-16 w-16 text-orange-600 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-orange-800 mb-4">
                  Already Logged In
                </h2>
                <p className="text-orange-700 mb-6 text-lg">
                  You're currently logged in as{" "}
                  <span className="font-semibold">
                    {CurrentUser.data.role || CurrentUser.data.user.email}
                  </span>
                </p>

                <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mb-6">
                  <p className="text-orange-800 text-sm">
                    To accept this invite and create a new account, you need to
                    logout from your current account first. You can only have
                    one account per session.
                  </p>
                </div>

                {/* Invite Info */}
                <Card className="mb-6 border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-orange-900">
                      Pending Invite
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 justify-center">
                      <Link className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800">
                        Invited by: <strong>{invite.username}</strong>
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {logoutMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    Go to Dashboard
                  </Button>
                </div>

                {/* Logout Error */}
                {logoutMutation.isError && (
                  <Alert variant="destructive" className="mt-4">
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
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-auto">
      <div className="min-h-full">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Join Connect Friends
              </h1>
              <p className="text-lg text-gray-600">
                You've been invited to join our community!
              </p>
            </div>

            {/* Invite Info Card */}
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-blue-900">
                    Invite Details
                  </CardTitle>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-mono text-blue-800">
                    Invited by: {invite.username}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Registration Form */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Create Your Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Full Name / Username (make sure its a name from which host
                      can recognize you)
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name or username"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="h-11"
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="h-11"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="h-11"
                    />
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="h-11"
                    />
                    {formData.password !== formData.confirmPassword &&
                      formData.confirmPassword && (
                        <p className="text-sm text-red-600">
                          Passwords do not match
                        </p>
                      )}
                  </div>

                  {/* Show Password Toggle */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showPassword"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="showPassword" className="text-sm">
                      Show passwords
                    </Label>
                  </div>

                  {/* Error Alert */}
                  {registerMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {registerMutation.error.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success Alert */}
                  {registerMutation.isSuccess && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Registration successful! Redirecting...
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-11 text-lg"
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  {/* Login Link */}
                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-600">
                      Already have an account?{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-blue-600"
                        onClick={() => router.push("/")}
                      >
                        Sign in here
                      </Button>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center mt-8 pb-8">
              <p className="text-sm text-gray-500">
                We welcome you to Connect Friends! If you have any issues,
                please contact on email hitmanguy1238@gmail.com (unofficial
                email)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
