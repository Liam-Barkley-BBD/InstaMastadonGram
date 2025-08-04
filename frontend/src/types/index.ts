export type UserProfile = {
  id: number;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  followers: string;
  following: string;
  posts: string;
  bio: string;
  location: string;
  mutualFriends: number;
  isOnline: boolean;
};


export type BasicUserProfile = {
  id: number;
  username: string;
  avatar: string;
};