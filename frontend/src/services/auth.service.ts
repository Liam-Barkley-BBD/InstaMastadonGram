import { useState, useEffect } from 'react';
import { get } from '../utils/fetch.function';

export interface AuthenticatedUser {
  handle: string;
  inboxUri: string;
  url:string;
  name:string;
}

export default function useAuth() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchUser = async () => {
      try {
          const res = await get(`${backendUrl}/api/users/me`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
        } else {
          setUser(user);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  return { user, authLoading };
}

export function isCurrentUser(handle:string){
  return handle === useAuth().user?.handle
}