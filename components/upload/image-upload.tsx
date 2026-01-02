"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { Id } from "@/convex/_generated/dataModel";

interface ImageUploadProps {
  onUploadComplete: (storageIds: Id<"_storage">[]) => void;
  maxFiles?: number;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

interface UploadingFile {
  file: File;
  preview: string;
  progress: number;
  storageId?: Id<"_storage">;
}

export function ImageUpload({
  onUploadComplete,
  maxFiles = 10,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSizeMB = 10,
  className = "",
}: ImageUploadProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !token) return;

      const fileArray = Array.from(files);

      // Validate file count
      if (uploadingFiles.length + fileArray.length > maxFiles) {
        toast({
          title: "Error",
          description: `Maximum ${maxFiles} files allowed`,
          variant: "destructive",
        });
        return;
      }

      // Validate files
      const validFiles: File[] = [];
      for (const file of fileArray) {
        // Check file type
        if (!accept.split(",").includes(file.type)) {
          toast({
            title: "Error",
            description: `${file.name}: Invalid file type. Accepted: ${accept}`,
            variant: "destructive",
          });
          continue;
        }

        // Check file size
        const sizeInMB = file.size / (1024 * 1024);
        if (sizeInMB > maxSizeMB) {
          toast({
            title: "Error",
            description: `${file.name}: File too large. Max size: ${maxSizeMB}MB`,
            variant: "destructive",
          });
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      // Create preview URLs
      const newFiles: UploadingFile[] = validFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      // Upload files
      const uploadedIds: Id<"_storage">[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fileIndex = uploadingFiles.length + i;

        try {
          // Update progress to show starting
          setUploadingFiles((prev) => {
            const updated = [...prev];
            updated[fileIndex] = { ...updated[fileIndex], progress: 10 };
            return updated;
          });

          // Get upload URL
          const uploadUrl = await generateUploadUrl({ token });

          // Update progress
          setUploadingFiles((prev) => {
            const updated = [...prev];
            updated[fileIndex] = { ...updated[fileIndex], progress: 30 };
            return updated;
          });

          // Upload file
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok) {
            throw new Error(`Upload failed: ${result.statusText}`);
          }

          const { storageId } = await result.json();

          // Update progress to complete
          setUploadingFiles((prev) => {
            const updated = [...prev];
            updated[fileIndex] = {
              ...updated[fileIndex],
              progress: 100,
              storageId: storageId as Id<"_storage">,
            };
            return updated;
          });

          uploadedIds.push(storageId as Id<"_storage">);
        } catch (error: any) {
          toast({
            title: "Error",
            description: `Failed to upload ${file.name}: ${error.message}`,
            variant: "destructive",
          });
          console.error("Upload error:", error);

          // Remove failed file
          setUploadingFiles((prev) => prev.filter((_, idx) => idx !== fileIndex));
        }
      }

      // Call callback with all uploaded IDs
      if (uploadedIds.length > 0) {
        onUploadComplete(uploadedIds);
        toast({
          title: "Success",
          description: `Successfully uploaded ${uploadedIds.length} file(s)`,
        });
      }
    },
    [token, accept, maxSizeMB, maxFiles, uploadingFiles.length, generateUploadUrl, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadingFiles((prev) => {
      const updated = [...prev];
      // Revoke preview URL
      URL.revokeObjectURL(updated[index].preview);
      return updated.filter((_, idx) => idx !== index);
    });
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFiles]
  );

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">
              Drag and drop images here, or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max {maxFiles} files, up to {maxSizeMB}MB each
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Files
          </Button>
        </div>
      </div>

      {/* Preview Grid */}
      {uploadingFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {uploadingFiles.map((file, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="w-full h-full object-cover"
                />

                {/* Progress overlay */}
                {file.progress < 100 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-sm font-medium">
                      {file.progress}%
                    </div>
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-1 truncate">
                {file.file.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
