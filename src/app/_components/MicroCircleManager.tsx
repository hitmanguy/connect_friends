"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "../../../utils/providers/TrpcProviders";
import {
  CircleDot,
  Plus,
  Edit3,
  Trash2,
  Users,
  UserPlus,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";
import { CharLimitInfo } from "./char_limit";

interface User {
  _id: string;
  username?: string;
  email: string;
  profileImage?: string;
}

interface MicroCircleManagerProps {
  users: User[];
  onRefresh: () => void;
}

const CIRCLE_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#84cc16", // Lime
  "#ec4899", // Pink
  "#6b7280", // Gray
];

const MicroCircleManager: React.FC<MicroCircleManagerProps> = ({
  users,
  onRefresh,
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCircle, setEditingCircle] = useState<any>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [circleToDelete, setCircleToDelete] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(CIRCLE_COLORS[0]);

  const microCirclesQuery = trpc.microCircle.getMicroCircles.useQuery();

  const createMutation = trpc.microCircle.createMicroCircle.useMutation({
    onSuccess: () => {
      microCirclesQuery.refetch();
      onRefresh();
      resetForm();
      setIsCreateDialogOpen(false);
    },
  });

  const updateMembersMutation =
    trpc.microCircle.updateMicroCircleMembers.useMutation({
      onSuccess: () => {
        microCirclesQuery.refetch();
        onRefresh();
        setIsEditDialogOpen(false);
        setEditingCircle(null);
      },
    });

  const deleteMutation = trpc.microCircle.deleteMicroCircle.useMutation({
    onSuccess: () => {
      microCirclesQuery.refetch();
      onRefresh();
      setIsDeleteDialogOpen(false);
      setCircleToDelete(null);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor(CIRCLE_COLORS[0]);
    setSelectedMembers([]);
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      memberIds: selectedMembers,
    });
  };

  const handleEditMembers = (circle: any) => {
    setEditingCircle(circle);
    setSelectedMembers(circle.members.map((m: any) => m._id));
    setSearchQuery("");
    setIsEditDialogOpen(true);
  };

  const handleUpdateMembers = () => {
    if (!editingCircle) return;

    if (selectedMembers.length === 0) {
      setIsEditDialogOpen(false);
      setCircleToDelete(editingCircle);
      setIsDeleteDialogOpen(true);
      return;
    }

    updateMembersMutation.mutate({
      circleId: editingCircle._id,
      memberIds: selectedMembers,
      action: "SET",
    });
  };

  const handleDeleteConfirm = () => {
    if (!circleToDelete) return;

    deleteMutation.mutate({
      circleId: circleToDelete._id,
    });
  };

  const openDeleteDialog = (circle: any) => {
    setCircleToDelete(circle);
    setIsDeleteDialogOpen(true);
  };

  const handleMemberToggle = (userId: string, isChecked: boolean) => {
    setSelectedMembers((prev) =>
      isChecked ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  const resetSearch = () => {
    setSearchQuery("");
  };

  const filteredUsers = (users || []).filter((user) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const username = (user.username || "").toLowerCase();
    const email = (user.email || "").toLowerCase();

    return username.includes(query) || email.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Micro Circles</h2>
          <p className="text-gray-600">Organize users into groups and teams</p>
        </div>

        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              resetForm();
              resetSearch();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Micro Circle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Micro Circle</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Circle Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Design Team, Friends"
                    maxLength={50}
                  />
                  <CharLimitInfo value={name} limit={50} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span>Circle Color</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CIRCLE_COLORS.map((colorOption, index) => (
                        <SelectItem key={colorOption} value={colorOption}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: colorOption }}
                            />
                            <span>Color {index + 1}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this micro circle..."
                  maxLength={200}
                />
                <CharLimitInfo value={description} limit={200} />
              </div>

              <div className="space-y-3">
                <Label>Select Members</Label>

                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 mb-2"
                  />
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No users found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={`member-${user._id}`}
                          checked={selectedMembers.includes(user._id)}
                          onCheckedChange={(checked) =>
                            handleMemberToggle(user._id, checked as boolean)
                          }
                        />
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={user.profileImage}
                            alt={user.username}
                          />
                          <AvatarFallback className="text-xs">
                            {user.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {selectedMembers.length} member(s) selected
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsCreateDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Circle
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {microCirclesQuery.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          <span className="ml-2">Loading micro circles...</span>
        </div>
      ) : microCirclesQuery.data?.circles?.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CircleDot className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Micro Circles Yet
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Create your first micro circle to organize users into groups
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Circle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {microCirclesQuery.data?.circles?.map((circle) => (
            <Card
              key={circle._id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: circle.color }}
                    />
                    <CardTitle className="text-lg">{circle.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {circle.memberCount} members
                  </Badge>
                </div>
                {circle.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {circle.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Members</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {circle.members.slice(0, 6).map((member: User) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage
                            src={member.profileImage}
                            alt={member.username}
                          />
                          <AvatarFallback className="text-xs">
                            {member.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          {member.username}
                        </span>
                      </div>
                    ))}
                    {circle.memberCount > 6 && (
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
                        <span className="text-xs font-medium">
                          +{circle.memberCount - 6}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditMembers(circle)}
                    className="flex-1"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit Members
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => openDeleteDialog(circle)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingCircle(null);
            resetSearch();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Members - {editingCircle?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: editingCircle?.color }}
              />
              <span className="font-medium">{editingCircle?.name}</span>
              <Badge variant="outline">{selectedMembers.length} selected</Badge>
            </div>

            {selectedMembers.length === 0 && (
              <Alert variant="default" className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                <AlertDescription className="text-amber-800">
                  Removing all members will delete this circle.
                </AlertDescription>
              </Alert>
            )}

            <div className="relative mb-2">
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto border rounded-lg p-3 space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found matching "{searchQuery}"
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user._id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`edit-member-${user._id}`}
                      checked={selectedMembers.includes(user._id)}
                      onCheckedChange={(checked) =>
                        handleMemberToggle(user._id, checked as boolean)
                      }
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={user.profileImage}
                        alt={user.username}
                      />
                      <AvatarFallback className="text-xs">
                        {user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    {editingCircle?.members?.some(
                      (m: any) => m._id === user._id
                    ) && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  openDeleteDialog(editingCircle);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Circle
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingCircle(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateMembers}
                  disabled={updateMembersMutation.isPending}
                  className={
                    selectedMembers.length === 0
                      ? "bg-red-600 hover:bg-red-700"
                      : ""
                  }
                >
                  {updateMembersMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Updating...
                    </>
                  ) : selectedMembers.length === 0 ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Circle
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Update Members
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Micro Circle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{circleToDelete?.name}</span>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setCircleToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {createMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to create micro circle: {createMutation.error.message}
          </AlertDescription>
        </Alert>
      )}

      {updateMembersMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to update members: {updateMembersMutation.error.message}
          </AlertDescription>
        </Alert>
      )}

      {deleteMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to delete micro circle: {deleteMutation.error.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MicroCircleManager;
