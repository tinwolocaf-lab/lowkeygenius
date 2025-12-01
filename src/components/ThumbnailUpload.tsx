import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  uploadThumbnail,
  deleteThumbnail,
  validateThumbnailFile,
  ACCEPTED_THUMBNAIL_TYPES,
  MAX_THUMBNAIL_SIZE_BYTES,
} from '../utils/thumbnailStorage';

interface ThumbnailUploadProps {
  courseId: string;
  currentThumbnailUrl: string | null;
  onUploadComplete: (url: string | null) => void;
  disabled?: boolean;
}

type UploadState = 'idle' | 'validating' | 'uploading' | 'removing';

export function ThumbnailUpload({
  courseId,
  currentThumbnailUrl,
  onUploadComplete,
  disabled = false,
}: ThumbnailUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const maxSizeMB = MAX_THUMBNAIL_SIZE_BYTES / (1024 * 1024);
  const acceptedFormats = ACCEPTED_THUMBNAIL_TYPES.join(',');

  const clearPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!user) {
      setError('You must be logged in to upload thumbnails');
      return;
    }

    setError(null);
    setUploadState('validating');

    // Validate file
    const validation = validateThumbnailFile(file);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid file');
      setUploadState('idle');
      return;
    }

    // Create preview
    clearPreview();
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload file
    setUploadState('uploading');
    const result = await uploadThumbnail(file, user.id, courseId);

    if (result.error) {
      setError(result.error);
      clearPreview();
      setUploadState('idle');
      return;
    }

    setUploadState('idle');
    onUploadComplete(result.url ?? null);
  }, [user, courseId, clearPreview, onUploadComplete]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemovePreview = () => {
    clearPreview();
    setError(null);
  };

  const handleRemoveThumbnail = async () => {
    if (!user || !currentThumbnailUrl) return;

    setError(null);
    setUploadState('removing');

    const result = await deleteThumbnail(user.id, courseId);

    if (result.error) {
      setError(result.error);
      setUploadState('idle');
      return;
    }

    setUploadState('idle');
    onUploadComplete(null);
  };

  const handleClick = () => {
    if (!disabled && uploadState === 'idle') {
      fileInputRef.current?.click();
    }
  };

  const isLoading = uploadState === 'uploading' || uploadState === 'validating' || uploadState === 'removing';
  const displayUrl = previewUrl ?? currentThumbnailUrl;
  const hasImage = !!displayUrl;

  return (
    <div className="w-full">
      <label className="block font-body font-bold text-neutral-text mb-2">
        Course Thumbnail
      </label>
      
      <div
        className={`
          relative w-full aspect-video rounded-xl border-2 border-dashed
          transition-all duration-200 overflow-hidden
          ${isDragOver ? 'border-primary bg-primary-light/20' : 'border-neutral-border'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-neutral-surface'}
          ${error ? 'border-accent-red' : ''}
        `}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label="Upload course thumbnail"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isLoading}
          aria-hidden="true"
        />

        {hasImage ? (
          <div className="relative w-full h-full">
            <img
              src={displayUrl}
              alt="Course thumbnail preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay for loading state */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {isLoading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-primary-light/30 flex items-center justify-center mb-3">
                  {isDragOver ? (
                    <Upload className="w-7 h-7 text-primary" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-primary" />
                  )}
                </div>
                <p className="font-body font-semibold text-neutral-text text-center">
                  {isDragOver ? 'Drop image here' : 'Click or drag to upload'}
                </p>
                <p className="font-body text-sm text-neutral-text-muted text-center mt-1">
                  JPEG, PNG, WebP, or GIF (max {maxSizeMB}MB)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {hasImage && !isLoading && (
        <div className="flex gap-2 mt-3">
          {previewUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePreview();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-body font-semibold text-neutral-text-muted hover:text-neutral-text rounded-lg hover:bg-neutral-surface transition-colors"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
          {currentThumbnailUrl && !previewUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveThumbnail();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-body font-semibold text-accent-red hover:text-accent-red/80 rounded-lg hover:bg-accent-red/10 transition-colors"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
              Remove thumbnail
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mt-2 text-accent-red">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-body font-semibold">{error}</p>
        </div>
      )}
    </div>
  );
}
