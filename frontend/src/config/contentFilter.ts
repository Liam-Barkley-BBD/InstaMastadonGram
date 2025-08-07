import type { Post } from '../types/Post';
import { stripHtml } from '../utils/htmlUtils';

const CONTENT_FILTER_CONFIG = {
  enableNsfwFilter: true,
  enableEnglishOnly: true,
  nsfwKeywords: [
    'nsfw', 'nsfl', 'sensitive', 'explicit', 'adult', 'mature',
    'porn', 'pornography', 'sex', 'sexual', 'nude', 'nudity',
    'violence', 'gore', 'blood', 'death', 'suicide', 'self-harm',
    'trigger', 'trauma', 'abuse', 'assault', 'rape', 'murder',
    'kink', 'bdsm', 'fetish', 'hentai', 'ecchi', 'yiff'
  ],
  filterSensitivePosts: true,
  filterExplicitHashtags: true,
  filterExplicitContent: true,
  logFilteredContent: false,
};

export const isEnglishContent = (content: string): boolean => {
  if (!CONTENT_FILTER_CONFIG.enableEnglishOnly) {
    return true;
  }
  
  const plainText = stripHtml(content);
  
  // Ccheck if content contains mostly ASCII characters
  // and common English words/patterns
  const asciiRatio = plainText.replace(/[^\\x00-\x7F]/g, '').length / plainText.length;
  
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
  
  const lowerText = plainText.toLowerCase();
  const englishWordCount = englishWords.filter(word => lowerText.includes(word)).length;
  
  return asciiRatio >= 0.8 && (plainText.length < 10 || englishWordCount >= 2);
};

export const containsNsfwContent = (content: string): boolean => {
  if (!CONTENT_FILTER_CONFIG.enableNsfwFilter) {
    return false;
  }
  
  const plainText = stripHtml(content);
  const lowerContent = plainText.toLowerCase();
  
  return CONTENT_FILTER_CONFIG.nsfwKeywords.some(keyword => 
    lowerContent.includes(keyword)
  );
};

export const filterPost = (post: Post): boolean => {
  if (CONTENT_FILTER_CONFIG.enableEnglishOnly && !isEnglishContent(post.content || '')) {
    if (CONTENT_FILTER_CONFIG.logFilteredContent) {
      console.log('Filtered out non-English post:', post.id);
    }
    return false;
  }
  
  if (CONTENT_FILTER_CONFIG.filterSensitivePosts && post.sensitive === true) {
    if (CONTENT_FILTER_CONFIG.logFilteredContent) {
      console.log('Filtered out sensitive post:', post.id);
    }
    return false;
  }
  
  if (CONTENT_FILTER_CONFIG.filterExplicitContent && containsNsfwContent(post.content || '')) {
    if (CONTENT_FILTER_CONFIG.logFilteredContent) {
      console.log('Filtered out NSFW content post:', post.id);
    }
    return false;
  }
  
  return true;
}; 