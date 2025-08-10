import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Home, Search, Plus, User } from "lucide-react";
import HomePage from "./pages/HomePage";
import Login from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SearchUsersPage from "./pages/SearchUsers";
import UploadMediaPage from "./pages/Uploadpage";
import FollowersPage from "./pages/FollowersPage";
import "./App.css";
import useAuth from "./services/auth.service";
import { FedifyHandler } from "./fedify/fedify";
import { useEffect } from "react";
import { CircularProgress, Box } from "@mui/material";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const fedify = new FedifyHandler();
  const { user, authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && location.pathname === "/login") {
      navigate("/");
    }
  }, [authLoading, user, location.pathname, navigate]);

  const sidebarItems = [
    { id: "home", icon: Home, label: "Home", path: "/" },
    { id: "search", icon: Search, label: "Search", path: "/search" },
    { id: "create", icon: Plus, label: "Create", path: "/create" },
    { id: "profile", icon: User, label: "Profile", path: "/me" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  if (authLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        width="100vw"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <div className="login-wrapper">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="beegram-sidebar">
        <header className="beegram-logo">
          <p>IMDG</p>
        </header>

        <nav className="beegram-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`beegram-nav-btn ${
                isActive(item.path) ? "active" : ""
              }`}
            >
              <item.icon size={24} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <footer className="beegram-profile">
          <section className="beegram-profile-card">
            <article>
              <h2 className="beegram-username">{user?.name!}</h2>
              <p className="beegram-handle">{user?.handle}</p>
            </article>
          </section>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="beegram-mobile-header">
          <h1 className="beegram-mobile-logo">IMDG</h1>
        </header>

        <div className="main-content-inner">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/me"
              element={<ProfilePage handle={user?.url} isProfileTab={true} />}
            />
            <Route
              path="/me"
              element={
                <ProfilePage
                  handle={fedify.extractUsername(user?.handle)}
                  isProfileTab={true}
                />
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/search" element={<SearchUsersPage />} />
            <Route path="/create" element={<UploadMediaPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route
              path="/users/:handle/followers"
              element={<FollowersPage isFollowers={true} />}
            />
            <Route
              path="/users/:handle/following"
              element={<FollowersPage isFollowers={false} />}
            />
          </Routes>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="beegram-mobile-nav">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className={`beegram-mobile-nav-btn ${
              isActive(item.path) ? "active" : ""
            }`}
          >
            <item.icon size={24} />
            <span className="beegram-mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
