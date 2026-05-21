/** True when a value can be stored on vehicleImages (storage id or http(s) URL). */
export const isPersistableImageRef = (ref: string): boolean => {
  const trimmed = ref.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:")) return false;
  return true;
};

export const revokeBlobPreviewUrl = (url: string | undefined) => {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};
