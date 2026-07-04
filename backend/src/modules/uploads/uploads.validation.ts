const allowedUploads = new Map<string, string[]>([
  ["application/pdf", [".pdf"]],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [".docx"]],
  ["image/png", [".png"]],
  ["image/jpeg", [".jpg", ".jpeg"]]
]);

export const maxUploadSizeBytes = 20 * 1024 * 1024;

export function isAllowedUpload(mimeType: string, extension: string) {
  const allowedExtensions = allowedUploads.get(mimeType);
  return allowedExtensions?.includes(extension.toLowerCase()) ?? false;
}
