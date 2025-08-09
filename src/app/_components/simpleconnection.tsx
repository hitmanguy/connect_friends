"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Check,
  User,
  Users,
  Search,
  Plus,
  X,
  Link as LinkIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserType {
  _id: string;
  username: string;
  email: string;
  profileImage?: string;
}

interface ConnectionType {
  _id: string;
  userA: {
    _id: string;
    username: string;
    email: string;
  };
  userB: {
    _id: string;
    username: string;
    email: string;
  };
  status?: string;
}

interface SimpleConnectionCreatorProps {
  users: UserType[];
  connections: ConnectionType[];
  onCreateConnections: (sourceUserId: string, targetUserIds: string[]) => void;
  isLoading?: boolean;
}

export default function SimpleConnectionCreator({
  users,
  connections = [],
  onCreateConnections,
  isLoading = false,
}: SimpleConnectionCreatorProps) {
  const [sourceUser, setSourceUser] = useState<UserType | null>(null);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSourceSearch, setShowSourceSearch] = useState(false);

  const isConnected = (userIdA: string, userIdB: string) => {
    return connections.some(
      (conn) =>
        (conn.userA._id === userIdA && conn.userB._id === userIdB) ||
        (conn.userA._id === userIdB && conn.userB._id === userIdA)
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const targetUsers = users.filter(
    (user) => !sourceUser || user._id !== sourceUser._id
  );

  const handleSelectSourceUser = (user: UserType) => {
    setSourceUser(user);
    setShowSourceSearch(false);
    setSearchQuery("");
    setTargetUserIds((prev) => prev.filter((id) => id !== user._id));
  };

  const toggleTargetUser = (userId: string) => {
    if (sourceUser && isConnected(sourceUser._id, userId)) {
      return;
    }

    setTargetUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateConnections = () => {
    if (sourceUser && targetUserIds.length > 0) {
      onCreateConnections(sourceUser._id, targetUserIds);
      setTargetUserIds([]);
    }
  };

  const resetSelections = () => {
    setSourceUser(null);
    setTargetUserIds([]);
    setShowSourceSearch(false);
    setSearchQuery("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Simple Connection Creator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">
              Step 1: Select Source User
            </h3>
            {!sourceUser ? (
              <div className="space-y-2">
                {showSourceSearch ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <ScrollArea className="h-48 border rounded-md">
                      <div className="p-1">
                        {filteredUsers.length === 0 ? (
                          <div className="p-2 text-center text-sm text-gray-500">
                            No users found
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <div
                              key={user._id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                              onClick={() => handleSelectSourceUser(user)}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={user.profileImage}
                                  alt={user.username}
                                />
                                <AvatarFallback>
                                  {user.username[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {user.username}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSourceSearch(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowSourceSearch(true)}
                    className="w-full justify-start"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Select Source User
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={sourceUser.profileImage}
                      alt={sourceUser.username}
                    />
                    <AvatarFallback>
                      {sourceUser.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{sourceUser.username}</p>
                    <p className="text-sm text-gray-600">{sourceUser.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSourceUser(null)}
                  className="text-gray-500 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {sourceUser && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">
                  Step 2: Select Users to Connect With
                </h3>
                {targetUserIds.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    {targetUserIds.length} selected
                  </Badge>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter users..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-48 border rounded-md mb-3">
                <div className="p-1">
                  {targetUsers.length === 0 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      No users available
                    </div>
                  ) : (
                    filteredUsers
                      .filter((user) => user._id !== sourceUser._id)
                      .map((user) => {
                        const alreadyConnected = isConnected(
                          sourceUser._id,
                          user._id
                        );

                        return (
                          <div
                            key={user._id}
                            className={`flex items-center gap-2 p-2 rounded ${
                              alreadyConnected
                                ? "bg-gray-100 cursor-not-allowed"
                                : "hover:bg-gray-100 cursor-pointer"
                            } ${
                              targetUserIds.includes(user._id)
                                ? "bg-blue-50"
                                : ""
                            }`}
                            onClick={() =>
                              !alreadyConnected && toggleTargetUser(user._id)
                            }
                          >
                            {alreadyConnected ? (
                              <div className="h-5 w-5 flex items-center justify-center">
                                <LinkIcon className="h-4 w-4 text-green-600" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 border rounded flex items-center justify-center bg-white">
                                {targetUserIds.includes(user._id) && (
                                  <Check className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                            )}
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={user.profileImage}
                                alt={user.username}
                              />
                              <AvatarFallback>
                                {user.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {user.username}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                            {alreadyConnected && (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-300"
                              >
                                Connected
                              </Badge>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={resetSelections}>
                  Reset
                </Button>
                <Button
                  onClick={handleCreateConnections}
                  disabled={targetUserIds.length === 0 || isLoading}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Connect {targetUserIds.length} User
                      {targetUserIds.length !== 1 && "s"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
