import { useState, useRef, useEffect } from 'react';

const MAX_FILE_MB = 5;
const MAX_WIDTH   = 900;   // resize to max 900px wide
const MAX_HEIGHT  = 700;
const QUALITY     = 0.82;  // JPEG compression quality (0-1)

/**
 * Resize + compress an image File using a canvas.
 * Always outputs JPEG regardless of input format.
 * Returns a base64 data URL string.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      let { width, height } = img;

      // Scale down if larger than max dimensions
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = blobUrl;
  });
}

/**
 * ImageUpload — compresses the picked image to a small JPEG base64 string
 * and passes it to onUploaded(). No server upload needed.
 *
 * Props:
 *   currentUrl  — existing image_url value (string | null)
 *   onUploaded  — called with the compressed base64 data URL string
 */
const ImageUpload = ({ currentUrl, onUploaded }) => {
  const [preview,    setPreview]    = useState(currentUrl || '');
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState('');
  const inputRef = useRef();

  // Sync when parent loads recipe data asynchronously
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

    // Reset input early so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';

    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      onUploaded(dataUrl);
    } catch {
      setError('Failed to process image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onUploaded('');
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
        <div className="image-drop-zone" onClick={() => !processing && inputRef.current?.click()}>
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
