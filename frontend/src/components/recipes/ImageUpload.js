import { useState, useRef, useEffect } from 'react';

const MAX_FILE_MB   = 5;
const FULL_MAX_W    = 900;
const FULL_MAX_H    = 700;
const FULL_QUALITY  = 0.82;
const THUMB_MAX_W   = 400;
const THUMB_MAX_H   = 300;
const THUMB_QUALITY = 0.70;

/**
 * Draw an image onto a canvas at the given dimensions and return a base64 JPEG.
 */
function canvasToBase64(img, width, height, quality) {
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Resize an image File to two sizes: full and thumbnail.
 * Returns { image_url, thumbnail_url } as base64 JPEG data URLs.
 */
function processImage(file) {
  return new Promise((resolve, reject) => {
    const img    = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      const { width: origW, height: origH } = img;

      // Full version
      const fullRatio = Math.min(
        FULL_MAX_W / origW,
        FULL_MAX_H / origH,
        1           // never upscale
      );
      const fullW = Math.round(origW * fullRatio);
      const fullH = Math.round(origH * fullRatio);
      const image_url = canvasToBase64(img, fullW, fullH, FULL_QUALITY);

      // Thumbnail version
      const thumbRatio = Math.min(
        THUMB_MAX_W / origW,
        THUMB_MAX_H / origH,
        1
      );
      const thumbW = Math.round(origW * thumbRatio);
      const thumbH = Math.round(origH * thumbRatio);
      const thumbnail_url = canvasToBase64(img, thumbW, thumbH, THUMB_QUALITY);

      resolve({ image_url, thumbnail_url });
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = blobUrl;
  });
}

/**
 * ImageUpload — compresses the picked image into a full + thumbnail base64 pair.
 *
 * Props:
 *   currentUrl   — existing image_url value for preview (string | null)
 *   onUploaded   — called with { image_url, thumbnail_url } after processing
 */
const ImageUpload = ({ currentUrl, onUploaded }) => {
  const [preview,    setPreview]    = useState(currentUrl || '');
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState('');
  const inputRef = useRef();

  // Sync preview when parent loads recipe data asynchronously
  useEffect(() => {
    if (currentUrl && currentUrl !== preview) {
      setPreview(currentUrl);
    }
  }, [currentUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Only JPG and PNG files are allowed.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_FILE_MB} MB.`);
      return;
    }

    setError('');
    setProcessing(true);
    if (inputRef.current) inputRef.current.value = '';

    try {
      const { image_url, thumbnail_url } = await processImage(file);
      setPreview(image_url);
      onUploaded({ image_url, thumbnail_url });
    } catch {
      setError('Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onUploaded({ image_url: '', thumbnail_url: '' });
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="image-upload-wrap">
      {preview ? (
        <div className="image-preview-box">
          <img src={preview} alt="Recipe" className="image-preview-img" />
          {processing && <p className="image-upload-progress">Compressing...</p>}
          {!processing && (
            <div className="image-preview-actions">
              <button type="button" className="btn btn-small btn-outline"
                onClick={() => inputRef.current?.click()}>
                Change
              </button>
              <button type="button" className="btn btn-small btn-danger"
                onClick={handleRemove}>
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="image-drop-zone"
          onClick={() => !processing && inputRef.current?.click()}>
          {processing ? (
            <p>Compressing...</p>
          ) : (
            <>
              <span className="image-drop-icon">📷</span>
              <p>Click to upload a photo</p>
              <p className="image-drop-hint">JPG or PNG, max 5 MB</p>
            </>
          )}
        </div>
      )}

      {error && <p className="image-upload-error">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUpload;
