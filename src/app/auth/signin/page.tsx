"use client";

import { AuthForm } from "@/app/components/auth/auth-form";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SignInPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Mark as loaded for animations
    setIsLoaded(true);
    
    // Force dark mode to be off on auth pages
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="auth-page">
      {/* Left side with image/branding - hidden on mobile */}
      <div className={`auth-left-section ${isLoaded ? "fade-in" : ""}`}>
        <div className="auth-left-background">
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("/globe.svg")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'contain'
          }}></div>
        </div>
        <div className="auth-left-content">
          <div className={`auth-logo-container ${isLoaded ? "slide-in" : ""}`}>
            <div className="auth-logo-circle">D</div>
          </div>
          <h1 className={`auth-heading ${isLoaded ? "slide-in-delay-1" : ""}`}>DapDip Social</h1>
          <p className={`auth-subheading ${isLoaded ? "slide-in-delay-2" : ""}`}>
            Connect, share, and thrive with our AI-powered social network designed for meaningful interactions.
          </p>
          <div className={`auth-feature-grid ${isLoaded ? "slide-in-delay-3" : ""}`}>
            <div className="auth-feature-box">
              <h3 className="auth-feature-title">Smart Connections</h3>
              <p className="auth-feature-text">AI-powered matching to find people with similar interests</p>
            </div>
            <div className="auth-feature-box">
              <h3 className="auth-feature-title">Content Analysis</h3>
              <p className="auth-feature-text">Get insights on your posts and engagement patterns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side with auth form */}
      <div className="auth-right-section">
        <div className={`auth-mobile-logo ${isLoaded ? "slide-in" : ""}`}>
          <div className="auth-mobile-logo-circle">D</div>
          <span className="auth-mobile-logo-text">DapDip</span>
        </div>

        <div className={isLoaded ? "slide-in-delay-1" : ""} style={{ width: '100%', opacity: isLoaded ? 1 : 0 }}>
          <AuthForm />
        </div>

        <div className={`auth-main-footer ${isLoaded ? "slide-in-delay-3" : ""}`}>
          <Link href="/" className="auth-main-link">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}