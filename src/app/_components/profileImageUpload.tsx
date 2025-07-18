// components/ProfileImageUpload.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Trash2, Camera } from "lucide-react";
import { trpc } from "../../../utils/providers/TrpcProviders";

interface ProfileImageUploadProps {
  currentImage?: string;
  userName: string;
  onImageUpdate?: (imageUrl: string | null) => void;
}

export default function ProfileImageUpload({
  currentImage,
  userName,
  onImageUpdate,
}: ProfileImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.user.uploadProfileImage.useMutation({
    onSuccess: (data) => {
      setPreview(data.imageUrl);
      onImageUpdate?.(data.imageUrl);
      setIsUploading(false);
    },
    onError: () => {
      setIsUploading(false);
    },
  });

  const deleteMutation = trpc.user.deleteProfileImage.useMutation({
    onSuccess: () => {
      setPreview(null);
      onImageUpdate?.(null);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setIsUploading(true);
      uploadMutation.mutate({ imageData: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete your profile image?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar Display */}
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-gray-200">
              <AvatarImage
                src={preview || undefined}
                alt={`${userName}'s profile`}
              />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Camera Icon Overlay */}
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-0 right-0 w-8 h-8 p-0 rounded-full"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {/* Upload Controls */}
          <div className="flex gap-2">
            <Button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {preview ? "Change" : "Upload"}
                </>
              )}
            </Button>

            {preview && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Info */}
          <p className="text-xs text-gray-500 text-center">
            Supported: JPG, PNG, GIF (max 5MB)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
