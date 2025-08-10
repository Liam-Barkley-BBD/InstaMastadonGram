import React from 'react';

interface PostContent {
  type: string;
  mediaType?: string;
  url?: string;
  name?: string;
  blurhash?: string;
  focalPoint?: number[];
  width?: number;
  height?: number;
}

interface Post {
  id: string;
  content: string | PostContent[];
  textcontent?: string | PostContent[];
  imagecontent?: string | PostContent[];
  videocontent?: string | PostContent[];
  mediacontent?: string | PostContent[];
  publishedDate: string;
  url: string;
  likes: number;
  shares?: number;
}

interface UserProfile {
  id: string;
  avatar?: string;
  username: string;
  displayName: string;
  bio: string;
  url: string;
  publishedDate: string;
  followers: any[];
  following: any[];
  posts: Post[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

interface PostModalProps {
  isOpen: boolean;
  post: Post | null;
  profile: UserProfile;
  onClose: () => void;
}

const extractTextContent = (content: string | PostContent[]): string => {
  if (typeof content === 'string') {
    return content.replace(/<[^>]*>/g, '');
  }
  return '';
};

const getMediaContent = (content: string | PostContent[] | PostContent): { images: PostContent[], videos: PostContent[] } => {
  const result = { images: [] as PostContent[], videos: [] as PostContent[] };

  if (Array.isArray(content)) {
    content.forEach(item => {
      if ((item.type === 'Image' || item.type === 'Document') && item.mediaType?.startsWith('image/')) {
        result.images.push(item);
      } else if ((item.type === 'Video' || item.type === 'Document') && item.mediaType?.startsWith('video/')) {
        result.videos.push(item);
      }
    });
  } else if (typeof content === 'object' && content !== null) {
    if ((content.type === 'Image' || content.type === 'Document') && content.mediaType?.startsWith('image/')) {
      result.images.push(content);
    } else if ((content.type === 'Video' || content.type === 'Document') && content.mediaType?.startsWith('video/')) {
      result.videos.push(content);
    }
  }

  return result;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return '1 day ago';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

const PostModal: React.FC<PostModalProps> = ({ isOpen, post, profile, onClose }) => {
  if (!isOpen || !post || !profile) return null;

  const textContent = extractTextContent(post.textcontent || '');
  
  const allMediaContent = [
    ...(post.imagecontent ? [post.imagecontent] : []),
    ...(post.videocontent ? [post.videocontent] : []),
    ...(post.mediacontent ? [post.mediacontent] : [])
  ];

  const mediaContent = allMediaContent.reduce((acc, content) => {
    const { images, videos } = getMediaContent(content);
    acc.images.push(...images);
    acc.videos.push(...videos);
    return acc;
  }, { images: [] as PostContent[], videos: [] as PostContent[] });

  return (
    <div className="post-modal-overlay" onClick={onClose}>
      <div className="post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="post-modal-header">
          <div className="post-author">
            <img
              src={profile.avatar || '/default-avatar.png'}
              alt={profile.displayName}
              className="post-author-avatar"
            />
            <span className="post-author-name">{profile.displayName || profile.username}</span>
          </div>
          <button className="post-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="post-modal-content">
          {/* Render images */}
          {mediaContent.images.length > 0 && (
            <div className="post-modal-media">
              {mediaContent.images.map((image, index) => (
                <div key={`image-${index}`} className="post-modal-image">
                  <img
                    src={image.url}
                    alt={image.name || `Post image ${index + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Render videos */}
          {mediaContent.videos.length > 0 && (
            <div className="post-modal-media">
              {mediaContent.videos.map((video, index) => (
                <div key={`video-${index}`} className="post-modal-video">
                  <video
                    src={video.url}
                    controls
                    preload="metadata"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                    aria-label={video.name || `Post video ${index + 1}`}
                  >
                    <source src={video.url} type={video.mediaType} />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ))}
            </div>
          )}

          {textContent && (
            <div className="post-modal-text">
              <p>{textContent}</p>
            </div>
          )}
        </div>

        <div className="post-modal-footer">
          <div className="post-actions">
            <button className="post-action like">
              <span className="action-icon">♥</span>
              <span>{post.likes}</span>
            </button>
            {post.shares !== undefined && (
              <button className="post-action share">
                <span className="action-icon">↗</span>
                <span>{post.shares}</span>
              </button>
            )}
          </div>
          <div className="post-timestamp">
            {formatDate(post.publishedDate)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostModal;