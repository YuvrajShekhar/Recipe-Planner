import { useState, useRef } from 'react';
import { recipeAPI } from '../../services/api';

/**
 * ImageUpload — drop-in replacement for the image URL text input.
 * Props:
 *   currentUrl  — the current image_url value (string | null)
 *   onUploaded  — called with the new URL string after a successful upload
 */
const ImageUpload = ({ currentUrl, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentUrl || '');
  const inputRef = useRef();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      setError('Only JPG and PNG files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setError('');

    try {
      setUploading(true);
      const res = await recipeAPI.uploadImage(file);
      const url = res.data.url;
      setPreview(url);
      onUploaded(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setPreview(currentUrl || '');
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = '';
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
          <div className="image-preview-actions">
            <button type="button" className="btn btn-small btn-outline"
              onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Change'}
            </button>
            <button type="button" className="btn btn-small btn-danger"
              onClick={handleRemove} disabled={uploading}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="image-drop-zone" onClick={() => inputRef.current?.click()}>
          {uploading ? (
            <p>Uploading...</p>
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
