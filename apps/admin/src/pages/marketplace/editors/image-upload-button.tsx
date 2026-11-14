import { useState } from 'react';
import { UPLOAD_IMAGE_TYPES, uploadMarketplaceImage } from '../../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../../marketplace/copy';
import type { ImageUploadButtonProps } from './image-upload-button.types';

export function ImageUploadButton({
  uploadPath,
  kind,
  disabled,
  onUploaded,
}: ImageUploadButtonProps): JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>();

  async function upload(file: File | undefined): Promise<void> {
    if (!file) return;
    setUploading(true);
    setError(undefined);
    try {
      onUploaded(await uploadMarketplaceImage(uploadPath, kind, file));
    } catch (uploadError) {
      setError(uploadError);
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className='marketplace-upload'>
      <span className='secondary-button'>
        {uploading ? marketplaceCopy.profile.uploading : marketplaceCopy.profile.upload}
      </span>
      <input
        accept={UPLOAD_IMAGE_TYPES.join(',')}
        disabled={uploading || disabled === true}
        hidden
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = '';
        }}
        type='file'
      />
      <small>{marketplaceCopy.profile.imageHint}</small>
      {error ? <strong className='error-text'>{marketplaceErrorMessage(error)}</strong> : null}
    </label>
  );
}
