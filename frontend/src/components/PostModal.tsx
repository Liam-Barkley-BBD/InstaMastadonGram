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

const getImageContent = (content: string | PostContent[]): PostContent | null => {
  if (Array.isArray(content)) {
    return content.find(item => item.type === 'Document' && item.mediaType?.startsWith('image/')) || null;
  }
  return null;
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
  const imageContent = getImageContent(post.imagecontent || []);

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
          {imageContent && (
            <div className="post-modal-image">
              <img
                src={imageContent.url}
                alt={imageContent.name || 'Post image'}
              />
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
