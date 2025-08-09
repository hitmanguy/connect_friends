"use client";

import { useState, useEffect, JSX } from "react";
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

import {
  User,
  Users,
  UserPlus,
  Link,
  BarChart3,
  Save,
  RefreshCcw,
  PieChart,
  Network,
  CircleDot,
  ClipboardList,
  ClipboardX,
  UserPlus2,
  Unlink,
  Users2,
  Menu,
  X,
} from "lucide-react";
import { trpc } from "../../../../../utils/providers/TrpcProviders";
import HubCircleGraph from "../../../_components/connection_Graph";
import SimpleConnectionCreator from "../../../_components/simpleconnection";
import MicroCircleManager from "../../../_components/MicroCircleManager";
import InviteManager from "../../../_components/InviteManager";
import ProfileImageUpload from "../../../_components/profileImageUpload";
import { CharLimitInfo } from "@/app/_components/char_limit";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [activeConnectionTab, setActiveConnectionTab] = useState("graph");
  const [userName, setUserName] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userQuery = trpc.auth.getCurrentUser.useQuery({ fulluser: true });
  const allUsersQuery = trpc.user.getAllUsers.useQuery();
  const connectionsQuery = trpc.connection.getConnections.useQuery();
  const microCirclesQuery = trpc.microCircle.getMicroCircles.useQuery();
  const connectionLedgerQuery = trpc.connection.getConnectionLedger.useQuery({
    limit: 20,
    offset: 0,
  });

  const toast = useToast();

  const createConnectionMutation = trpc.connection.createConnection.useMutation(
    {
      onSuccess: () => {
        connectionsQuery.refetch();
      },
    }
  );

  const createMultipleConnectionsMutation =
    trpc.connection.createmultipleConnections.useMutation({
      onSuccess: () => {
        connectionsQuery.refetch();
      },
      onError: (error) => {
        toast.toast({ variant: "destructive", description: error.message });
      },
    });

  const deleteConnectionMutation = trpc.connection.deleteConnection.useMutation(
    {
      onSuccess: () => {
        connectionsQuery.refetch();
      },
      onError: (error) => {
        toast.toast({ variant: "destructive", description: error.message });
      },
    }
  );
  const updateUsernameMutation = trpc.user.updateUsername.useMutation({
    onSuccess: (data) => {
      toast.toast({ description: "Username updated successfully!" });
      userQuery.refetch();
    },
    onError: (error) => {
      toast.toast({ variant: "destructive", description: error.message });
    },
  });

  const deleteMultipleConnectionsMutation =
    trpc.connection.deletemultipleConnections.useMutation({
      onSuccess: () => {
        connectionsQuery.refetch();
      },
      onError: (error) => {
        toast.toast({ variant: "destructive", description: error.message });
      },
    });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      console.log("Logout successful");
      window.location.reload();
    },
    onError: (error) => {
      console.error("Logout failed:", error);
    },
  });

  useEffect(() => {
    if (userQuery.data?.user) {
      setUserName(userQuery.data.user.username || "");
    }

    if (
      !userQuery.isLoading &&
      !allUsersQuery.isLoading &&
      !connectionsQuery.isLoading &&
      !connectionLedgerQuery.isLoading
    ) {
      setIsPageLoading(false);
    }
  }, [
    userQuery.data,
    userQuery.isLoading,
    allUsersQuery.isLoading,
    connectionsQuery.isLoading,
    connectionLedgerQuery.isLoading,
  ]);

  const handleCreateConnections = (
    sourceUserId: string,
    targetUserIds: string[]
  ) => {
    targetUserIds.forEach((targetId) => {
      createConnectionMutation.mutate({
        userAId: sourceUserId,
        userBId: targetId,
      });
    });
  };

  const handleUpdateUsername = () => {
    if (userName.trim() === "") {
      toast.toast({
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50">
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
              <Users className="w-5 h-5" />
              <span>Connections</span>
            </button>
            <button
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center gap-3 ${
                activeTab === "invites"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => handleTabChange("invites")}
            >
              <Link className="w-5 h-5" />
              <span>Invites</span>
            </button>
            <button
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === "analytics"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => handleTabChange("analytics")}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
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
              <Users className="w-5 h-5" />
              <span>Connections</span>
            </button>

            <button
              className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "invites"
                  ? "border-blue-500 text-blue-600 font-medium"
                  : "border-transparent hover:bg-blue-50"
              }`}
              onClick={() => setActiveTab("invites")}
            >
              <Link className="w-5 h-5" />
              <span>Invites</span>
            </button>

            <button
              className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "analytics"
                  ? "border-blue-500 text-blue-600 font-medium"
                  : "border-transparent hover:bg-blue-50"
              }`}
              onClick={() => setActiveTab("analytics")}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "connections" && (
        <div className="bg-blue-50 border-b border-blue-100 shadow-sm overflow-x-auto hide-scrollbar">
          <div className="flex p-1">
            <button
              className={`px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap rounded-t-lg text-sm ${
                activeConnectionTab === "graph"
                  ? "bg-white text-blue-600 font-medium shadow-sm"
                  : "text-blue-700 hover:bg-blue-100/50"
              }`}
              onClick={() => setActiveConnectionTab("graph")}
            >
              <Network className="w-4 h-4" />
              <span>Graph</span>
            </button>

            <button
              className={`px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap rounded-t-lg text-sm ${
                activeConnectionTab === "connector"
                  ? "bg-white text-blue-600 font-medium shadow-sm"
                  : "text-blue-700 hover:bg-blue-100/50"
              }`}
              onClick={() => setActiveConnectionTab("connector")}
            >
              <UserPlus className="w-4 h-4" />
              <span>Connector</span>
            </button>

            <button
              className={`px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap rounded-t-lg text-sm ${
                activeConnectionTab === "circles"
                  ? "bg-white text-blue-600 font-medium shadow-sm"
                  : "text-blue-700 hover:bg-blue-100/50"
              }`}
              onClick={() => setActiveConnectionTab("circles")}
            >
              <CircleDot className="w-4 h-4" />
              <span>Circles</span>
            </button>
          </div>
        </div>
      )}

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
                                onChange={(e) => setUserName(e.target.value)}
                                className="border-blue-200 focus-visible:ring-blue-500 text-base sm:text-lg py-5 sm:py-6"
                                placeholder="Enter your display name"
                                maxLength={100}
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
            <>
              {activeConnectionTab === "graph" && (
                <Card className="shadow-lg sm:shadow-xl border-blue-100 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 p-4 sm:pb-6">
                    <CardTitle className="text-xl sm:text-2xl text-blue-800 flex items-center gap-2 sm:gap-3">
                      <Network className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      Connection Network
                    </CardTitle>
                    <CardDescription className="text-blue-600 text-sm">
                      Interactive visualization of your network
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-8">
                    <div className="bg-white p-3 sm:p-6 rounded-xl border border-blue-100 shadow-sm mb-4 sm:mb-6">
                      <div className="mb-3 sm:mb-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-blue-800">
                          Interactive Network
                        </h3>
                        <p className="text-sm text-blue-600">
                          Explore connections between members
                        </p>
                      </div>

                      <div className="border border-blue-100 rounded-xl bg-gradient-to-br from-blue-50/40 to-sky-50/40 h-[70vh] sm:h-[800px] w-full overflow-hidden shadow-inner">
                        {allUsersQuery.data?.users &&
                          connectionsQuery.data?.connections && (
                            <HubCircleGraph
                              host={userQuery.data?.user}
                              users={allUsersQuery.data?.users || []}
                              connections={
                                connectionsQuery.data?.connections || []
                              }
                              microCircles={
                                microCirclesQuery.data?.circles || []
                              }
                              onCreateConnection={(userAId, userBId) => {
                                createConnectionMutation.mutate({
                                  userAId,
                                  userBId,
                                });
                              }}
                              onDeleteConnection={(connectionId) => {
                                deleteConnectionMutation.mutate({
                                  connectionId,
                                });
                              }}
                              onCreateMultipleConnections={(pairs) => {
                                const seen = new Set<string>();
                                const payload = pairs
                                  .filter(
                                    (p) =>
                                      p.userAId &&
                                      p.userBId &&
                                      p.userAId !== p.userBId
                                  )
                                  .filter((p) => {
                                    const k = [p.userAId, p.userBId]
                                      .sort()
                                      .join("_");
                                    if (seen.has(k)) return false;
                                    seen.add(k);
                                    return true;
                                  });
                                if (payload.length) {
                                  createMultipleConnectionsMutation.mutate({
                                    connections: payload,
                                  });
                                }
                              }}
                              onDeleteMultipleConnections={(ids) => {
                                const unique = Array.from(
                                  new Set(ids.filter(Boolean))
                                );
                                if (unique.length) {
                                  deleteMultipleConnectionsMutation.mutate({
                                    connectionIds: unique,
                                  });
                                }
                              }}
                            />
                          )}
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100 text-sm">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="text-blue-700 mt-1">
                          <Info className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div>
                          <p className="text-blue-800 font-medium">
                            Graph Navigation Tips
                          </p>
                          <p className="text-xs sm:text-sm text-blue-600 mt-1">
                            Click 2 or more users to connect them with
                            eachother. Do similar to unconnect them. Use fit
                            view for whole view of network, zoom in and zoom out
                            for better vision. Can use pan mode to move around
                            the graph.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeConnectionTab === "connector" && (
                <Card className="shadow-lg sm:shadow-xl border-blue-100 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 p-4 sm:pb-6">
                    <CardTitle className="text-xl sm:text-2xl text-blue-800 flex items-center gap-2 sm:gap-3">
                      <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      Simple Connection Creator
                    </CardTitle>
                    <CardDescription className="text-blue-600 text-sm">
                      Create direct connections between users
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-8">
                    <div className="bg-white p-3 sm:p-6 rounded-xl border border-blue-100 shadow-md">
                      <h3 className="text-lg sm:text-xl font-semibold text-blue-800 mb-3 sm:mb-6">
                        Create New Connections
                      </h3>

                      <SimpleConnectionCreator
                        users={allUsersQuery.data?.users || []}
                        connections={connectionsQuery.data?.connections || []}
                        onCreateConnections={handleCreateConnections}
                        isLoading={createConnectionMutation.isPending}
                      />
                    </div>

                    <div className="mt-4 sm:mt-6 flex justify-end">
                      <Button
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 text-sm"
                        onClick={() => setActiveConnectionTab("graph")}
                      >
                        <Network className="h-4 w-4 mr-1 sm:mr-2" />
                        View Connection Graph
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeConnectionTab === "circles" && (
                <Card className="shadow-lg sm:shadow-xl border-blue-100 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 p-4 sm:pb-6">
                    <CardTitle className="text-xl sm:text-2xl text-blue-800 flex items-center gap-2 sm:gap-3">
                      <CircleDot className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      Micro Circle Management
                    </CardTitle>
                    <CardDescription className="text-blue-600 text-sm">
                      Create and manage micro circles
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-8">
                    <div className="bg-white p-3 sm:p-6 rounded-xl border border-blue-100 shadow-md">
                      <h3 className="text-lg sm:text-xl font-semibold text-blue-800 mb-3 sm:mb-6">
                        Micro Circle Manager
                      </h3>

                      <MicroCircleManager
                        users={allUsersQuery.data?.users || []}
                        onRefresh={() => {
                          microCirclesQuery.refetch();
                          connectionsQuery.refetch();
                        }}
                      />
                    </div>

                    <div className="mt-4 sm:mt-6">
                      <Button
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 text-sm"
                        onClick={() => setActiveConnectionTab("graph")}
                      >
                        <Network className="h-4 w-4 mr-1 sm:mr-2" />
                        View in Network Graph
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "invites" && (
            <Card className="shadow-lg sm:shadow-xl border-blue-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 p-4 sm:pb-6">
                <CardTitle className="text-xl sm:text-2xl text-blue-800 flex items-center gap-2 sm:gap-3">
                  <Link className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  Invitation Management
                </CardTitle>
                <CardDescription className="text-blue-600 text-sm">
                  Create and manage invitations
                </CardDescription>
              </CardHeader>

              <CardContent className="p-3 sm:p-8">
                <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
                  <div className="p-3 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      Invitation System
                    </h3>
                    <p className="text-sm text-blue-600 mb-4 sm:mb-6">
                      Generate and track invitation links
                    </p>
                  </div>

                  <div className="px-3 sm:px-6 pb-6 sm:pb-8">
                    <InviteManager showCreateForm={true} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "analytics" && (
            <Card className="shadow-lg sm:shadow-xl border-blue-100 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 p-4 sm:pb-6">
                <CardTitle className="text-xl sm:text-2xl text-blue-800 flex items-center gap-2 sm:gap-3">
                  <PieChart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  Network Analytics
                </CardTitle>
                <CardDescription className="text-blue-600 text-sm">
                  View statistics and insights about your network
                </CardDescription>
              </CardHeader>

              <CardContent className="p-3 sm:p-8 space-y-4 sm:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <div className="bg-white p-4 sm:p-6 rounded-xl border border-blue-100 shadow-sm">
                    <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4">
                      Key Metrics Overview
                    </h3>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="flex flex-col gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm text-blue-500">
                          Total Connections
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-blue-800">
                          {connectionsQuery.data?.connections.length || 0}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm text-blue-500">
                          Total Users
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-blue-800">
                          {allUsersQuery.data?.users.length || 0}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm text-blue-500">
                          Micro Circles
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-blue-800">
                          {microCirclesQuery.data?.circles?.length || 0}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm text-blue-500">
                          Connection Ratio
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-blue-800">
                          {(allUsersQuery.data?.users?.length ?? 0) > 0
                            ? (
                                (connectionsQuery.data?.connections.length ||
                                  0) / (allUsersQuery.data?.users?.length ?? 1)
                              ).toFixed(1)
                            : "0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      Connection Activity
                    </h3>

                    <div className="bg-white p-3 sm:p-6 rounded-xl border border-blue-100 shadow-sm">
                      {connectionLedgerQuery.isLoading ? (
                        <div className="h-40 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-blue-600 text-sm">
                              Loading activity...
                            </p>
                          </div>
                        </div>
                      ) : connectionLedgerQuery.data?.entries &&
                        connectionLedgerQuery.data.entries.length > 0 ? (
                        <div className="overflow-hidden">
                          <div className="rounded-lg overflow-x-auto -mx-3 px-3">
                            <table className="w-full text-xs sm:text-sm">
                              <thead>
                                <tr className="bg-blue-50">
                                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-blue-800 font-medium">
                                    Activity
                                  </th>
                                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-blue-800 font-medium hidden sm:table-cell">
                                    Notes
                                  </th>
                                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-blue-800 font-medium">
                                    Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-100">
                                {connectionLedgerQuery.data.entries.map(
                                  (entry) => {
                                    const act = getLedgerActivity(entry);
                                    return (
                                      <tr
                                        key={entry._id}
                                        className="hover:bg-blue-50/50 transition-colors"
                                      >
                                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                                          <div className="flex items-center gap-2">
                                            {act.icon}
                                            <span
                                              className={`font-medium ${act.color}`}
                                            >
                                              {act.text}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-blue-700 max-w-xs hidden sm:table-cell">
                                          <div className="truncate">
                                            {entry.notes || "-"}
                                          </div>
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-blue-700 whitespace-nowrap">
                                          {formatDateCompact(entry.timestamp)}
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-center">
                          <div>
                            <ClipboardX className="h-8 w-8 sm:h-10 sm:w-10 text-blue-300 mx-auto mb-2 sm:mb-3" />
                            <p className="text-blue-800 font-medium text-sm">
                              No connection activity
                            </p>
                            <p className="text-blue-500 text-xs mt-1">
                              Events appear when users connect
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4 flex items-center gap-2">
                      <Network className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      Network Overview
                    </h3>

                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-blue-100 shadow-sm">
                      <div className="h-48 sm:h-64 flex items-center justify-center">
                        {connectionsQuery.data?.connections?.length ? (
                          <div className="text-center">
                            <div className="mb-4">
                              <Button
                                variant="outline"
                                className="border-blue-200 text-blue-600 hover:bg-blue-50 text-sm"
                                onClick={() => {
                                  setActiveTab("connections");
                                  setActiveConnectionTab("graph");
                                }}
                              >
                                <Network className="h-4 w-4 mr-2" />
                                View Network Graph
                              </Button>
                            </div>
                            <p className="text-blue-600 text-xs sm:text-sm">
                              See your interactive network visualization
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Network className="h-8 w-8 sm:h-10 sm:w-10 text-blue-300 mx-auto mb-2 sm:mb-3" />
                            <p className="text-blue-800 font-medium text-sm">
                              No connections found
                            </p>
                            <p className="text-blue-500 text-xs mt-1">
                              Create connections to visualize your network
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateCompact(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffInDays === 1) {
    return "Yesterday";
  } else if (diffInDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }
}

function getLedgerActivity(entry: any): {
  icon: JSX.Element;
  text: string;
  color: string;
} {
  const type = String(entry.type || "").toUpperCase();
  const userA = entry.userA?.username || "User A";
  const userB = entry.userB?.username || "User B";

  const normalized = type.includes("CREATED")
    ? "CREATED"
    : type.includes("DELETED") || type.includes("REMOVED")
    ? "DELETED"
    : "UPDATED";

  switch (normalized) {
    case "CREATED":
      return {
        icon: <UserPlus2 className="h-4 w-4 text-green-600" />,
        text: `Connected: ${userA} ↔ ${userB}`,
        color: "text-green-700",
      };
    case "DELETED":
      return {
        icon: <Unlink className="h-4 w-4 text-red-600" />,
        text: `Removed: ${userA} ↔ ${userB}`,
        color: "text-red-700",
      };
    default:
      return {
        icon: <RefreshCcw className="h-4 w-4 text-blue-600" />,
        text: `Updated: ${userA} ↔ ${userB}`,
        color: "text-blue-700",
      };
  }
}

function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
