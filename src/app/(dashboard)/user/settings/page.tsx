"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import { User, Save, CircleDot, Menu, X, Users, Search } from "lucide-react";
import { trpc } from "../../../../../utils/providers/TrpcProviders";
import MicroCircleManager from "../../../_components/MicroCircleManager";
import ProfileImageUpload from "../../../_components/profileImageUpload";
import { CharLimitInfo } from "@/app/_components/char_limit";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [userName, setUserName] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const userQuery = trpc.auth.getCurrentUser.useQuery({ fulluser: true });
  const isHost = userQuery.data?.user?.UserRole === "host";
  const UserConnectionQuery = isHost
    ? trpc.user.getAllUsers.useQuery()
    : trpc.connection.getUserConnections.useQuery();
  const connectionsQuery = trpc.connection.getConnections.useQuery();
  const microCirclesQuery = trpc.microCircle.getMicroCircles.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      console.log("Logout successful");
      window.location.reload();
    },
    onError: (error) => {
      console.error("Logout failed:", error);
    },
  });

  const { toast } = useToast();

  const updateUsernameMutation = trpc.user.updateUsername.useMutation({
    onSuccess: (data) => {
      toast({ description: "Username updated successfully!" });
      userQuery.refetch();
    },
    onError: (error) => {
      toast({ variant: "destructive", description: error.message });
    },
  });

  useEffect(() => {
    if (userQuery.data?.user) {
      setUserName(userQuery.data.user.username || "");
    }

    if (
      !userQuery.isLoading &&
      !UserConnectionQuery.isLoading &&
      !connectionsQuery.isLoading
    ) {
      setIsPageLoading(false);
    }
  }, [
    userQuery.data,
    userQuery.isLoading,
    UserConnectionQuery.isLoading,
    connectionsQuery.isLoading,
  ]);

  const meId = useMemo(
    () =>
      String(
        (userQuery.data?.user as any)?._id ||
          (userQuery.data?.user as any)?.id ||
          ""
      ),
    [userQuery.data?.user]
  );
  const allUsers = (UserConnectionQuery.data as any)?.users ?? [];
  const allConnections = (connectionsQuery.data as any)?.connections ?? [];

  function extractParticipantIds(conn: any): string[] {
    const out = new Set<string>();
    const push = (v: any) => v && out.add(String(v));
    // common shapes
    push(conn.user1Id);
    push(conn.user2Id);
    push(conn.userAId);
    push(conn.userBId);
    push(conn.userId1);
    push(conn.userId2);
    if (conn.user1?._id || conn.user1?.id)
      push(conn.user1._id || conn.user1.id);
    if (conn.user2?._id || conn.user2?.id)
      push(conn.user2._id || conn.user2.id);
    if (Array.isArray(conn.users))
      conn.users.forEach((u: any) => push(u?._id || u?.id || u));
    if (Array.isArray(conn.members))
      conn.members.forEach((u: any) => push(u?._id || u?.id || u));
    if (Array.isArray(conn.participants))
      conn.participants.forEach((u: any) => push(u?._id || u?.id || u));
    return Array.from(out);
  }

  const connectedIdSet = useMemo(() => {
    const set = new Set<string>();
    if (!meId) return set;
    for (const c of allConnections) {
      const ids = extractParticipantIds(c);
      if (ids.includes(meId)) {
        ids.forEach((id) => {
          if (id !== meId) set.add(id);
        });
      }
    }
    return set;
  }, [allConnections, meId]);

  const connectedUsers = useMemo(() => {
    if (!isHost) {
      return Array.isArray(allUsers) ? allUsers : [];
    }

    const fromUsers =
      Array.isArray(allUsers) && allUsers.length
        ? allUsers.filter((u: any) => {
            const id = String(u?._id || u?.id || "");
            return id && id !== meId && connectedIdSet.has(id);
          })
        : [];

    if (fromUsers.length > 0) return fromUsers;

    const byId = new Map<string, any>();
    for (const c of allConnections) {
      const ids = extractParticipantIds(c);
      if (!ids.includes(meId)) continue;
      const candidates: any[] = [];
      if (c.user1 && (c.user1._id || c.user1.id)) candidates.push(c.user1);
      if (c.user2 && (c.user2._id || c.user2.id)) candidates.push(c.user2);
      if (Array.isArray(c.users)) candidates.push(...c.users);
      if (Array.isArray(c.members)) candidates.push(...c.members);
      candidates.forEach((u) => {
        const id = String(u?._id || u?.id || "");
        if (id && id !== meId) byId.set(id, u);
      });
    }
    return Array.from(byId.values());
  }, [allUsers, allConnections, connectedIdSet, meId]);

  const filteredConnected = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return connectedUsers;
    return connectedUsers.filter((u: any) => {
      const name = String(u?.username || u?.name || "").toLowerCase();
      const email = String(u?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [connectedUsers, userSearch]);

  const handleUpdateUsername = () => {
    if (userName.trim() === "") {
      toast({
        variant: "destructive",
        description: "Username cannot be empty",
      });
      return;
    }

    updateUsernameMutation.mutate({ username: userName });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isPageLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-50 z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24">
            <div className="absolute top-0 left-0 w-full h-full border-6 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-6 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-blue-800 font-medium text-xl">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-white to-sky-50">
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 text-white px-3 sm:px-4 py-4 sm:py-6 shadow-lg relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {userQuery.data?.user?.profileImage ? (
                <img
                  src={userQuery.data.user.profileImage}
                  alt="Profile"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white object-cover shadow-md"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg sm:text-xl line-clamp-1">
                  {userQuery.data?.user?.username}
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 line-clamp-1">
                  {userQuery.data?.user?.UserRole} Account
                </p>
              </div>
            </div>

            <button
              className="block sm:hidden p-2 rounded-full hover:bg-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="block sm:hidden bg-white border-b border-blue-100 shadow-md z-40">
          <div className="p-2">
            <button
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center gap-3 ${
                activeTab === "profile"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => handleTabChange("profile")}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
            <button
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center gap-3 ${
                activeTab === "connections"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => handleTabChange("connections")}
            >
              <CircleDot className="w-5 h-5" />
              <span>Micro Circles</span>
            </button>
            <button
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center gap-3 ${
                activeTab === "users"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => handleTabChange("users")}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
            </button>
          </div>
        </div>
      )}

      <div className="hidden sm:block bg-white border-b border-blue-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto hide-scrollbar">
            <button
              className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600 font-medium"
                  : "border-transparent hover:bg-blue-50"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>

            <button
              className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "connections"
                  ? "border-blue-500 text-blue-600 font-medium"
                  : "border-transparent hover:bg-blue-50"
              }`}
              onClick={() => setActiveTab("connections")}
            >
              <CircleDot className="w-5 h-5" />
              <span>Micro Circles</span>
            </button>

            <button
              className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "users"
                  ? "border-blue-500 text-blue-600 font-medium"
                  : "border-transparent hover:bg-blue-50"
              }`}
              onClick={() => setActiveTab("users")}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-10">
        <div className="flex-1">
          {activeTab === "profile" && (
            <Card className="shadow-lg sm:shadow-xl border-blue-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl text-blue-800 flex items-center gap-2 sm:gap-3">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  Profile Settings
                </CardTitle>
                <CardDescription className="text-blue-600 text-sm">
                  Manage your personal information and account settings
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                  <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                    <div className="w-full md:w-1/3">
                      <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-4 sm:p-6 rounded-xl border border-blue-100">
                        <h3 className="text-lg font-semibold text-blue-800 mb-4">
                          Profile Image
                        </h3>
                        <div className="flex justify-center">
                          <ProfileImageUpload
                            currentImage={userQuery.data?.user?.profileImage}
                            userName={userName}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-2/3">
                      <div className="bg-white p-4 sm:p-6 rounded-xl border border-blue-100 shadow-sm">
                        <h3 className="text-lg font-semibold text-blue-800 mb-4">
                          Personal Information
                        </h3>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label
                              htmlFor="name"
                              className="text-blue-900 text-sm sm:text-base"
                            >
                              Display Name
                            </Label>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Input
                                id="name"
                                value={userName}
                                maxLength={100}
                                onChange={(e) => setUserName(e.target.value)}
                                className="border-blue-200 focus-visible:ring-blue-500 text-base sm:text-lg py-5 sm:py-6"
                                placeholder="Enter your display name"
                              />
                              <CharLimitInfo value={userName} limit={100} />
                              <Button
                                className="bg-blue-600 hover:bg-blue-700 text-base sm:text-lg py-5 sm:py-6 sm:px-6"
                                onClick={handleUpdateUsername}
                              >
                                <Save className="h-5 w-5 mr-2" />
                                Save
                              </Button>
                            </div>
                          </div>

                          <Separator className="my-4 sm:my-6 bg-blue-100" />

                          <div className="space-y-3">
                            <Label
                              htmlFor="email"
                              className="text-blue-900 text-sm sm:text-base"
                            >
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              value={userQuery.data?.user?.email || ""}
                              disabled
                              className="border-blue-200 bg-blue-50 text-blue-800 text-base sm:text-lg py-5 sm:py-6"
                            />
                            <p className="text-xs sm:text-sm text-blue-500 mt-2">
                              Email cannot be changed directly. Contact support
                              for assistance.
                            </p>
                          </div>

                          <div className="flex items-center justify-end mt-6 sm:mt-8">
                            <Button
                              onClick={handleLogout}
                              disabled={logoutMutation.isPending}
                              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                            >
                              {logoutMutation.isPending ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                  Logging out...
                                </>
                              ) : (
                                "Logout"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "connections" && (
            <Card className="shadow-lg sm:shadow-xl border-blue-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl text-blue-800 flex items-center gap-2 sm:gap-3">
                  <CircleDot className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  Micro Circle Management
                </CardTitle>
                <CardDescription className="text-blue-600 text-sm">
                  Create and manage micro circles for your network
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-blue-100 shadow-md">
                  <h3 className="text-lg sm:text-xl font-semibold text-blue-800 mb-4 sm:mb-6">
                    Micro Circle Manager
                  </h3>

                  <div className="overflow-hidden rounded-lg">
                    <MicroCircleManager
                      users={UserConnectionQuery.data?.users || []}
                      onRefresh={() => {
                        microCirclesQuery.refetch();
                        connectionsQuery.refetch();
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "users" && (
            <Card className="shadow-lg sm:shadow-xl border-blue-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl text-blue-800 flex items-center gap-2 sm:gap-3">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  Connected Users
                </CardTitle>
                <CardDescription className="text-blue-600 text-sm">
                  People you are directly connected with
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="mb-4 sm:mb-6">
                  <div className="relative">
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users by name or email"
                      className="pl-10 border-blue-200 focus-visible:ring-blue-500"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    {filteredConnected.length} result
                    {filteredConnected.length === 1 ? "" : "s"}
                  </p>
                </div>

                {filteredConnected.length === 0 ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 text-blue-700 text-sm">
                    No connected users found.
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {filteredConnected.map((u: any) => {
                      const id = String(u?._id || u?.id || "");
                      const avatar = u?.profileImage;
                      const name = u?.username || u?.name || "User";
                      const email = u?.email || "";
                      return (
                        <li
                          key={id}
                          className="rounded-xl border border-blue-100 bg-white shadow-sm p-3 sm:p-4 flex items-center gap-3"
                        >
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={name}
                              className="w-10 h-10 rounded-full object-cover border border-blue-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                              {String(name).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-blue-900 truncate">
                              {name}
                            </div>
                            <div className="text-xs text-blue-600 truncate">
                              {email || "—"}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
