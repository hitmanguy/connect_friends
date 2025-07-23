"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InviteManager from "@/app/_components/InviteManager";
import MicroCircleManager from "@/app/_components/MicroCircleManager";
import { trpc } from "../../../../utils/providers/TrpcProviders";
import {
  Users,
  Network,
  Plus,
  Activity,
  UserPlus,
  CircleDot,
  History,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HubPodGraph from "@/app/_components/connection_Graph";

export default function HostPage() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedMicroCircle, setSelectedMicroCircle] = useState<string>("");

  // Queries
  const currentUserQuery = trpc.auth.getCurrentUser.useQuery({
    fulluser: true,
  });
  const usersQuery = trpc.user.getAllUsers.useQuery();
  const connectionsQuery = trpc.connection.getConnections.useQuery();
  const microCirclesQuery = trpc.microCircle.getMicroCircles.useQuery();
  const ledgerQuery = trpc.connection.getConnectionLedger.useQuery({
    limit: 20,
  });

  // Mutations
  const createConnectionMutation = trpc.connection.createConnection.useMutation(
    {
      onSuccess: () => {
        connectionsQuery.refetch();
        ledgerQuery.refetch();
        setSelectedUsers([]);
      },
    }
  );

  const deleteConnectionMutation = trpc.connection.deleteConnection.useMutation(
    {
      onSuccess: () => {
        connectionsQuery.refetch();
        ledgerQuery.refetch();
      },
    }
  );

  const createMultipleConnectionsMutation =
    trpc.connection.createmultipleConnections.useMutation({
      onSuccess: () => {
        connectionsQuery.refetch();
        ledgerQuery.refetch();
        setSelectedUsers([]);
      },
    });

  const deleteMultipleConnectionsMutation =
    trpc.connection.deletemultipleConnections.useMutation({
      onSuccess: () => {
        connectionsQuery.refetch();
        ledgerQuery.refetch();
      },
    });

  const handleUserSelect = useCallback(
    (userId: string, isSelected: boolean) => {
      setSelectedUsers((prev) =>
        isSelected ? [...prev, userId] : prev.filter((id) => id !== userId)
      );
    },
    []
  );

  const handleCreateConnection = useCallback(
    (userAId: string, userBId: string, microCircleId?: string) => {
      createConnectionMutation.mutate({
        userAId,
        userBId,
      });
    },
    [createConnectionMutation]
  );

  const handleBatchConnect = () => {
    if (selectedUsers.length < 2) return;

    // Create connections between all selected users (mesh connection)
    for (let i = 0; i < selectedUsers.length; i++) {
      for (let j = i + 1; j < selectedUsers.length; j++) {
        handleCreateConnection(selectedUsers[i], selectedUsers[j]);
      }
    }
  };

  const stats = {
    totalUsers: usersQuery.data?.users?.length || 0,
    totalConnections: connectionsQuery.data?.connections?.length || 0,
    totalMicroCircles: microCirclesQuery.data?.circles?.length || 0,
    selectedCount: selectedUsers.length,
  };

  if (currentUserQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ✅ Better error handling
  if (currentUserQuery.isError || !currentUserQuery.data?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Failed to load user data. Please refresh the page or contact
            support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
              Connection Platform
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Manage your community and visualize connections
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Badge
              variant="default"
              className="bg-orange-100 text-orange-800 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Host: {currentUserQuery.data.user.username}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Network className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Connections</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalConnections}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CircleDot className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Micro Circles</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalMicroCircles}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Selected</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.selectedCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedUsers.length > 1 && (
          <Card className="mb-4 md:mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    {selectedUsers.length} users selected
                  </Badge>
                  <span className="text-xs md:text-sm text-blue-700">
                    Ready to create{" "}
                    {(selectedUsers.length * (selectedUsers.length - 1)) / 2}{" "}
                    connections
                  </span>
                  {microCirclesQuery.data?.circles &&
                    microCirclesQuery.data.circles.length > 0 && (
                      <select
                        value={selectedMicroCircle}
                        onChange={(e) => setSelectedMicroCircle(e.target.value)}
                        className="px-2 py-1 md:px-3 md:py-1 border rounded text-sm"
                      >
                        <option value="">No Micro Circle</option>
                        {microCirclesQuery.data.circles.map((circle) => (
                          <option key={circle._id} value={circle._id}>
                            {circle.name}
                          </option>
                        ))}
                      </select>
                    )}
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                  <Button
                    onClick={handleBatchConnect}
                    disabled={
                      selectedUsers.length < 2 ||
                      createConnectionMutation.isPending
                    }
                    className="bg-green-600 hover:bg-green-700 text-xs md:text-sm"
                    size="sm"
                  >
                    {createConnectionMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Connect Users
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setSelectedUsers([])}
                    variant="outline"
                    size="sm"
                    className="text-xs md:text-sm"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="graph" className="space-y-6">
          <TabsList className="grid w-full md:grid-cols-5 grid-cols-2 gap-2">
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span className="whitespace-nowrap">Connection Graph</span>
            </TabsTrigger>
            <TabsTrigger value="circles" className="flex items-center gap-2">
              <CircleDot className="h-4 w-4" />
              <span className="whitespace-nowrap">Micro Circles</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="whitespace-nowrap">Users</span>
            </TabsTrigger>
            <TabsTrigger value="invites" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="whitespace-nowrap">Invites</span>
            </TabsTrigger>
            <TabsTrigger value="ledger" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="whitespace-nowrap">Activity Log</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Connection Visualizer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersQuery.isLoading ||
                connectionsQuery.isLoading ||
                microCirclesQuery.isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading graph...</span>
                  </div>
                ) : (
                  <HubPodGraph
                    host={currentUserQuery.data.user}
                    users={usersQuery.data?.users || []}
                    connections={connectionsQuery.data?.connections || []}
                    microCircles={microCirclesQuery.data?.circles || []}
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
                    onCreateMultipleConnections={(connections) => {
                      createMultipleConnectionsMutation.mutate({
                        connections,
                      });
                    }}
                    onDeleteMultipleConnections={(connectionIds) => {
                      deleteMultipleConnectionsMutation.mutate({
                        connectionIds,
                      });
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Micro Circles Tab */}
          <TabsContent value="circles">
            <MicroCircleManager
              users={usersQuery.data?.users || []}
              onRefresh={() => {
                microCirclesQuery.refetch();
                usersQuery.refetch();
              }}
            />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usersQuery.data?.users?.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Avatar>
                        <AvatarImage
                          src={user.profileImage}
                          alt={user.username}
                        />
                        <AvatarFallback>
                          {user.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <Badge variant="outline">{user.UserRole}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites">
            <InviteManager showCreateForm={true} />
          </TabsContent>

          {/* Activity Ledger Tab */}
          <TabsContent value="ledger">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Connection Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ledgerQuery.isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ledgerQuery.data?.entries?.map((entry) => (
                      <div
                        key={entry._id}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg"
                      >
                        <Badge
                          variant={
                            entry.type === "CREATED" ? "default" : "destructive"
                          }
                          className="w-20 mb-1 sm:mb-0"
                        >
                          {entry.type}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">
                            <strong>{entry.userA.username}</strong> ↔{" "}
                            <strong>{entry.userB.username}</strong>
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error Alerts */}
        {createConnectionMutation.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              Failed to create connection:{" "}
              {createConnectionMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        {deleteConnectionMutation.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              Failed to delete connection:{" "}
              {deleteConnectionMutation.error.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
