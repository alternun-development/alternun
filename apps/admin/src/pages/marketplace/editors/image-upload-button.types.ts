export type ImageUploadButtonProps = {
  /** API endpoint that signs the upload, e.g. /v1/admin/projects/:id/media/upload-url. */
  uploadPath: string;
  kind: string;
  disabled?: boolean;
  onUploaded: (publicUrl: string) => void;
};
