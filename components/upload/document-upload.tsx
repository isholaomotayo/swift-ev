"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { Id } from "@/convex/_generated/dataModel";

interface DocumentUploadProps {
  onUploadComplete: (storageId: Id<"_storage">) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  className?: string;
}

interface UploadingDocument {
  file: File;
  progress: number;
  storageId?: Id<"_storage">;
  error?: string;
}

export function DocumentUpload({
  onUploadComplete,
  accept = "application/pdf,image/jpeg,image/jpg,image/png",
  maxSizeMB = 20,
  label = "Upload Document",
  className = "",
}: DocumentUploadProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [uploadingDoc, setUploadingDoc] = useState<UploadingDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || !token) return;

      // Validate file type
      const acceptedTypes = accept.split(",");
      if (!acceptedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: `Invalid file type. Accepted: ${accept}`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > maxSizeMB) {
        toast({
          title: "Error",
          description: `File too large. Max size: ${maxSizeMB}MB`,
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      setUploadingDoc({
        file,
        progress: 0,
      });

      try {
        // Update progress
        setUploadingDoc((prev) => (prev ? { ...prev, progress: 10 } : null));

        // Get upload URL
        const uploadUrl = await generateUploadUrl({ token });

        // Update progress
        setUploadingDoc((prev) => (prev ? { ...prev, progress: 30 } : null));

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
        setUploadingDoc((prev) =>
          prev
            ? {
                ...prev,
                progress: 100,
                storageId: storageId as Id<"_storage">,
              }
            : null
        );

        toast({
          title: "Success",
          description: "Document uploaded successfully",
        });
        onUploadComplete(storageId as Id<"_storage">);

        // Clear after a delay
        setTimeout(() => {
          setUploadingDoc(null);
          setIsUploading(false);
        }, 2000);
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to upload: ${error.message}`,
          variant: "destructive",
        });
        console.error("Upload error:", error);
        setUploadingDoc((prev) =>
          prev
            ? {
                ...prev,
                error: error.message,
              }
            : null
        );
        setIsUploading(false);
      }
    },
    [token, accept, maxSizeMB, generateUploadUrl, onUploadComplete]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFile]
  );

  const removeDocument = useCallback(() => {
    setUploadingDoc(null);
    setIsUploading(false);
  }, []);

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileInputChange}
        disabled={isUploading}
      />

      {!uploadingDoc ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {label}
        </Button>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded">
              <FileText className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{uploadingDoc.file.name}</p>
              <p className="text-xs text-gray-500">
                {(uploadingDoc.file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              {/* Progress Bar */}
              {uploadingDoc.progress < 100 && !uploadingDoc.error && (
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadingDoc.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploading... {uploadingDoc.progress}%
                  </p>
                </div>
              )}

              {/* Success State */}
              {uploadingDoc.progress === 100 && !uploadingDoc.error && (
                <div className="flex items-center gap-1 mt-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium">Upload complete</span>
                </div>
              )}

              {/* Error State */}
              {uploadingDoc.error && (
                <div className="mt-2">
                  <p className="text-xs text-red-600">{uploadingDoc.error}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleFile(uploadingDoc.file)}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>

            {/* Remove Button */}
            {(uploadingDoc.progress === 100 || uploadingDoc.error) && (
              <button
                type="button"
                onClick={removeDocument}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Accepted formats: {accept.split(",").join(", ")} (Max {maxSizeMB}MB)
      </p>
    </div>
  );
}
