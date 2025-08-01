import React, { useState, useRef } from "react";
import { Upload, X, Image, Video, Camera, Smile } from "lucide-react";
import "./Uploadpage.css";

const UploadMediaPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [location, setLocation] = useState("");
  const [taggedUsers, setTaggedUsers] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const fileObjects = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
      id: Math.random().toString(36).substr(2, 9),
    }));
    setSelectedFiles((prev) => [...prev, ...fileObjects]);
  };

  const removeFile = (id) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return updated;
    });
  };

  const handleShare = () => {
    console.log("Sharing post...", {
      files: selectedFiles,
      caption,
      location,
      taggedUsers,
    });
    alert("Post shared successfully! 🎉");
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.url));
    setSelectedFiles([]);
    setCaption("");
    setLocation("");
    setTaggedUsers([]);
    setShowAdvanced(false);
  };

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
            <span>@username</span>
          </div>
        </div>

        <div className="upload-grid">
          {/* Upload Section */}
          <div className="upload-left">
            <div className="upload-box">
              <h2>
                <Upload size={24} /> Upload Media
              </h2>

              {selectedFiles.length === 0 ? (
                <div
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
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
                      <button
                        className="remove-btn"
                        onClick={() => removeFile(file.id)}
                      >
                        <X size={14} />
                      </button>
                      <div className="media-icon">
                        {file.type === "video" ? (
                          <Video size={16} />
                        ) : (
                          <Image size={16} />
                        )}
                      </div>
                    </div>
                  ))}
                  <div
                    className="upload-more"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={24} />
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Post Details */}
          <div className="upload-right">
            <div className="upload-box">
              <h2>Post Details</h2>
              <div className="caption-box">
                <label>Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share your story... What's on your mind?"
                  maxLength={2200}
                />
                <div className="caption-footer">
                  <button>
                    <Smile size={20} />
                  </button>
                  <span>{caption.length}/2200</span>
                </div>
              </div>
              <button
                className="share-btn"
                disabled={selectedFiles.length === 0}
                onClick={handleShare}
              >
                Share Post
              </button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="upload-box">
                <h3>Preview</h3>
                <div className="preview-post">
                  <div className="preview-header">
                    <div className="upload-avatar small">U</div>
                    <div>
                      <p>username</p>
                      {location && <p className="location">{location}</p>}
                    </div>
                  </div>
                  <div className="preview-media">
                    {selectedFiles[0].type === "image" ? (
                      <img src={selectedFiles[0].url} alt="Preview" />
                    ) : (
                      <video src={selectedFiles[0].url} muted />
                    )}
                  </div>
                  {caption && (
                    <p>
                      <strong>username</strong> {caption}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadMediaPage;
