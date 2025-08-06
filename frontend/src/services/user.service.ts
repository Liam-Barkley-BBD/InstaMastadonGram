export interface AuthenticatedUser {
  handle: string;
  inboxUri: string;
}
 
export default function useAuth() {
//   const [user, setUser] = useState<AuthenticatedUser | null>(null);
//   const [authLoading, setAuthLoading] = useState<boolean>(true);
//   const backendUrl = import.meta.env.VITE_BACKEND_URL;
 
//   useEffect(() => {
//     const fetchUser = async () => {
//       let res;
//       try {
//         const user = getUserFromLocalStorage();
//         if(!user) {
//           res = await fetch(`${backendUrl}/api/users/me`, {
//           method: 'GET',
//           credentials: 'include',
//         });
// }
//         if (res && res.ok) {
//           const data = await res.json();
//           setUser(data);
//           localStorage.setItem("user", JSON.stringify(data));
//         } else {
//           setUser(user);
//         }
//       } catch (err) {
//         console.error('Auth check failed:', err);
//         setUser(null);
//       } finally {
//         setAuthLoading(false);
//       }
//     };
 
//     fetchUser();
//   }, []);
 
//   const getUserFromLocalStorage = (): AuthenticatedUser | null => {
//     const user = localStorage.getItem('user');
//     if (user) {
//       try {
//         return JSON.parse(user);
//       } catch (e) {
//         console.error('Error parsing user from localStorage:', e);
//         return null;
//       }
//     }
//     return null;
//   }
 
 
  return { user:{handle:"liambarkley@mastodon.social", inboxUrl:"https://mastodon.social/users/liambarkley/inbox"}, authLoading:false };
}
