import { useState, useRef, useEffect } from 'react';

const MAX_SIZE_MB = 5;

/**
 * ImageUpload — converts the selected image to a base64 data URL
 * and passes it to onUploaded(). No server upload needed.
 *
 * Props:
 *   currentUrl  — existing image_url value (string | null)
 *   onUploaded  — called with the base64 data URL string
 */
const ImageUpload = ({ currentUrl, onUploaded }) => {
  const [preview, setPreview] = useState(currentUrl || '');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  // Sync when parent loads recipe asynchronously
  useEffect(() => {
    if (currentUrl && currentUrl !== preview) {
      setPreview(currentUrl);
    }
  }, [currentUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Only JPG and PNG files are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    setError('');
    setProcessing(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      onUploaded(dataUrl);
      setProcessing(false);
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
      setProcessing(false);
    };
    reader.readAsDataURL(file);

    // Reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
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
          {processing && <p className="image-upload-progress">Processing...</p>}
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
        <div className="image-drop-zone" onClick={() => inputRef.current?.click()}>
          {processing ? (
            <p>Processing...</p>
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
