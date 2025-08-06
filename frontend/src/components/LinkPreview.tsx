import React, { useState, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";
import type { LinkPreview } from "../utils/linkUtils";
import { fetchLinkPreview } from "../utils/linkUtils";

interface LinkPreviewProps {
  url: string;
}

const LinkPreviewComponent: React.FC<LinkPreviewProps> = ({ url }) => {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true);
        const linkPreview = await fetchLinkPreview(url);
        setPreview(linkPreview);
      } catch (error) {
        console.error("Error loading link preview:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="beegram-link-preview">
        <div className="beegram-link-preview-skeleton">
          <div className="beegram-link-preview-skeleton-image"></div>
          <div className="beegram-link-preview-skeleton-content">
            <div className="beegram-link-preview-skeleton-title"></div>
            <div className="beegram-link-preview-skeleton-description"></div>
            <div className="beegram-link-preview-skeleton-domain"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <div className="beegram-link-preview">
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="beegram-link-preview-content"
      >
        {preview.image && (
          <div className="beegram-link-preview-image">
            <img src={preview.image} alt={preview.title || "Link preview"} />
          </div>
        )}
        <div className="beegram-link-preview-text">
          <h4 className="beegram-link-preview-title">{preview.title}</h4>
          {preview.description && (
            <p className="beegram-link-preview-description">
              {preview.description}
            </p>
          )}
          <div className="beegram-link-preview-domain">
            <Globe size={12} />
            <span>{preview.domain}</span>
            <ExternalLink size={12} />
          </div>
        </div>
      </a>
    </div>
  );
};

export default LinkPreviewComponent;
