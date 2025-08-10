import { useState, useRef } from "react";
import { Upload, X, Image, Video, Camera } from "lucide-react";
import "./styles/Uploadpage.css";
// import { isCurrentUser } from "../services/user.service";
import useAuth from "../services/user.service";

type SelectedFile = {
  file: File;
  url: string;
  type: string;
  id: string;
};

const UploadMediaPage = () => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [caption, setCaption] = useState<string>("");
  const [, setShowAdvanced] = useState<boolean>(false);
  const [location, setLocation] = useState<string>("");
  const [
    // taggedUsers
    , setTaggedUsers] = useState([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileObject = {
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
      id: Math.random().toString(36).substr(2, 9),
    };

    setSelectedFiles([fileObject]);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return updated;
    });
  };

  const handleShare = async () => {
    if (!caption.trim()) {
      alert("Caption is required.");
      return;
    }

    const formData = new FormData();
    formData.append("content", caption);

    if (selectedFiles.length > 0) {
      formData.append("media", selectedFiles[0].file);
    }

    try {
      const handle = user?.handle;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/posts/${handle}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Upload failed:", error);
        alert("Failed to upload post.");
        return;
      }

      selectedFiles.forEach((f) => URL.revokeObjectURL(f.url));
      setSelectedFiles([]);
      setCaption("");
      setLocation("");
      setTaggedUsers([]);
      setShowAdvanced(false);
    } catch (error) {
      console.error("Error uploading:", error);
      alert("An error occurred while uploading.");
    }
  };

  if (!user?.handle) {
    return (
      <div className="upload-page loading-screen">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <div>
            <h1>Create Post</h1>
            <p>Share your moments with the world</p>
          </div>
          <div className="upload-user-info">
            <div className="upload-avatar">U</div>
            <span>@{user.handle}</span>
          </div>
        </div>

        <div className="upload-box combined-box">
          <h2>
            <Upload size={24} /> Create Post
          </h2>

          {/* Upload Section */}
          {selectedFiles.length === 0 ? (
            <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
              <div className="dropzone-content">
                <div className="dropzone-icon">
                  <Camera size={32} />
                </div>
                <p className="dropzone-title">No image content</p>
                <p className="dropzone-subtitle">
                  Drag photos and videos here or click to browse
                </p>
              </div>
            </div>
          ) : (
            <div className="upload-preview-grid">
              {selectedFiles.map((file) => (
                <div key={file.id} className="upload-preview-item">
                  <div className="preview-media">
                    {file.type === "image" ? (
                      <img src={file.url} alt="Preview" />
                    ) : (
                      <video src={file.url} muted />
                    )}
                  </div>
                  <button className="remove-btn" onClick={() => removeFile(file.id)}>
                    <X size={14} />
                  </button>
                  <div className="media-icon">
                    {file.type === "video" ? <Video size={16} /> : <Image size={16} />}
                  </div>
                </div>
              ))}
              <div className="upload-more" onClick={() => fileInputRef.current?.click()}>
                <Upload size={24} />
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Post Details */}
          <div className="caption-box" style={{ marginTop: "1.5rem" }}>
            <label>Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share your story... What's on your mind?"
              maxLength={2200}
            />
            <div className="caption-footer">
              <span>{caption.length}/2200</span>
            </div>
          </div>

          <button className="share-btn" disabled={!caption.trim()} onClick={handleShare}>
            Share Post
          </button>
        </div>
        {(selectedFiles.length > 0 || caption) && (
          <div className="upload-box preview">
            <h3>Preview</h3>
            <div className="preview-post">
              <div className="preview-header">
                <div className="upload-avatar small">U</div>
                <div>
                  <p>{user?.handle ?? "username"}</p>
                  {location && <p className="location">{location}</p>}
                </div>
              </div>
              {selectedFiles.length > 0 && (
                <div className="preview-media">
                  {selectedFiles[0].type === "image" ? (
                    <img src={selectedFiles[0].url} alt="Preview" />
                  ) : (
                    <video src={selectedFiles[0].url} muted />
                  )}
                </div>
              )}
              {caption && (
                <p>
                  <strong>{user?.handle ?? "username"}</strong> {caption}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadMediaPage;
