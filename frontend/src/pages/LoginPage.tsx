import React, { useState, useEffect } from "react";
import "./styles/LoginPage.css";
import googleLogo from "../assets/google-logo.svg";

const Login: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });

  const handleGoogleAuth = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setMousePosition({ x, y });
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: 0.5, y: 0.5 });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const containerStyle = {
    transform: `perspective(1000px) rotateX(${
      (mousePosition.y - 0.5) * 5
    }deg) rotateY(${(mousePosition.x - 0.5) * 5}deg)`,
  };

  return (
    <div className="login-page">
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="login-container" style={containerStyle}>
        <header className="beegram-logo">
          <p>IMDG</p>
        </header>

        <div className="welcome-text">
          <h1>Welcome to IMDG</h1>
          <p>
            No passwords, no fuss. Just hit that Google button below to log in
            or sign up. Easy peasy.
          </p>
        </div>

        <button className="google-btn" onClick={handleGoogleAuth}>
          <img src={googleLogo} width="50" /> Continue with Google
        </button>

        <div className="divider">
          <span>Secure & Fast</span>
          <span>Connect with friends and discover new people</span>
          <span>Share your moments and stories</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
