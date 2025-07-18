"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "../../../utils/providers/TrpcProviders";
import { useState } from "react";
import { Copy, Users, Calendar, Link, Trash2 } from "lucide-react";

type ExpiresAtOption = "1 day" | "1 week" | "1 month" | "Never";

interface Invite {
  _id: string;
  code: string;
  expiresAt?: Date;
  createdAt: Date;
  userJoinedIds: string[];
  createdBy: string;
}

interface InviteManagerProps {
  className?: string;
  showCreateForm?: boolean;
}

export default function InviteManager({
  className = "",
  showCreateForm = true,
}: InviteManagerProps) {
  const [expiresAt, setExpiresAt] = useState<ExpiresAtOption>("1 day");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const createInvite = trpc.auth.createInvite.useMutation({
    onSuccess: (data) => {
      console.log("Invite created:", data);
      setExpiresAt("1 day");
      getInvites.refetch();
    },
    onError: (error) => {
      console.error("Failed to create invite:", error);
    },
  });

  const deleteInvite = trpc.auth.deleteInvite.useMutation({
    onSuccess: () => {
      console.log("Invite deleted successfully");
      getInvites.refetch();
    },
    onError: (error) => {
      console.error("Failed to delete invite:", error);
    },
  });

  const getInvites = trpc.auth.getInvites.useQuery();

  const options: Record<ExpiresAtOption, number | null> = {
    "1 day": 24 * 60 * 60 * 1000,
    "1 week": 7 * 24 * 60 * 60 * 1000,
    "1 month": 30 * 24 * 60 * 60 * 1000,
    Never: null,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const expirationDate =
      expiresAt !== "Never" && options[expiresAt] !== null
        ? new Date(Date.now() + (options[expiresAt] as number))
        : undefined;

    createInvite.mutate({ expiresAt: expirationDate });
  };

  const handleDeleteInvite = (inviteId: string) => {
    deleteInvite.mutate({ inviteId });
  };

  const copyInviteLink = async (code: string) => {
    const inviteLink = `${window.location.origin}/invite/${code}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const formatExpiryDate = (expiresAt?: Date) => {
    if (!expiresAt) return "Never";
    return new Date(expiresAt).toLocaleDateString();
  };

  const isExpired = (expiresAt?: Date) => {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  };

  return (
    <div className={className}>
      {/* Create Invite Form */}
      {showCreateForm && (
        <div className="max-w-md mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Create New Invite</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expires At</Label>
                  <Select
                    value={expiresAt}
                    onValueChange={(value) =>
                      setExpiresAt(value as ExpiresAtOption)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 day">1 Day</SelectItem>
                      <SelectItem value="1 week">1 Week</SelectItem>
                      <SelectItem value="1 month">1 Month</SelectItem>
                      <SelectItem value="Never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={createInvite.isPending}
                  className="w-full"
                >
                  {createInvite.isPending ? "Creating..." : "Create Invite"}
                </Button>
              </form>

              {createInvite.isSuccess && (
                <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
                  Invite created successfully!
                </div>
              )}

              {createInvite.isError && (
                <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">
                  Error: {createInvite.error.message}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invites Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-6">Your Invites</h2>

        {getInvites.isLoading && (
          <div className="text-center py-8">Loading invites...</div>
        )}

        {getInvites.isError && (
          <div className="text-center py-8 text-red-600">
            Error loading invites: {getInvites.error.message}
          </div>
        )}

        {getInvites.data && getInvites.data.invites?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No invites created yet.{" "}
            {showCreateForm ? "Create your first invite above!" : ""}
          </div>
        )}

        {getInvites.data && getInvites.data.invites?.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {getInvites.data.invites.map((invite: any) => {
              const mappedInvite: Invite = {
                _id: invite._id as string,
                code: invite.code as string,
                expiresAt: invite.expiresAt
                  ? new Date(invite.expiresAt)
                  : undefined,
                createdAt: new Date(invite.createdAt),
                userJoinedIds: Array.isArray(invite.userJoinedIds)
                  ? invite.userJoinedIds.map((id: any) => String(id))
                  : [],
                createdBy: invite.createdBy as string,
              };

              return (
                <Card key={mappedInvite._id} className="h-fit overflow-auto">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-mono truncate">
                          {mappedInvite.code}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant={
                            isExpired(mappedInvite.expiresAt)
                              ? "destructive"
                              : "default"
                          }
                        >
                          {isExpired(mappedInvite.expiresAt)
                            ? "Expired"
                            : "Active"}
                        </Badge>

                        {/* Delete Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invite</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete invite "
                                {mappedInvite.code}"? This action cannot be
                                undone and will invalidate the invite link.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteInvite(mappedInvite._id)
                                }
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteInvite.isPending}
                              >
                                {deleteInvite.isPending
                                  ? "Deleting..."
                                  : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Card Content */}
                  <CardContent className="space-y-4 pt-0">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 gap-3">
                      {/* Users Count */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm">
                          {mappedInvite.userJoinedIds.length} users joined
                        </span>
                      </div>

                      {/* Expiry Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm">
                          Expires: {formatExpiryDate(mappedInvite.expiresAt)}
                        </span>
                      </div>
                    </div>

                    {/* Invite Link Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <span className="text-sm font-medium">
                          Invite Link:
                        </span>
                      </div>

                      {/* Link Display and Copy Button */}
                      <div className="space-y-2">
                        <div className="p-2 bg-gray-50 rounded border">
                          <code className="text-xs break-all text-gray-700">
                            {`${
                              typeof window !== "undefined"
                                ? window.location.origin
                                : ""
                            }/invite/${mappedInvite.code}`}
                          </code>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyInviteLink(mappedInvite.code)}
                          className="w-full"
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          {copiedCode === mappedInvite.code
                            ? "Copied!"
                            : "Copy Link"}
                        </Button>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="text-xs text-gray-500 pt-3 border-t">
                      Created:{" "}
                      {new Date(mappedInvite.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
