"use client";

import { useState, useCallback, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type Variant = "LOGIN" | "REGISTER";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function AuthForm() {
  const router = useRouter();
  const [variant, setVariant] = useState<Variant>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // To handle client-side only animations
  useEffect(() => {
    setIsClient(true);
  }, []);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const toggleVariant = useCallback(() => {
    setVariant((current) => (current === "LOGIN" ? "REGISTER" : "LOGIN"));
    setError(null);
  }, []);

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await signIn("credentials", {
        ...data,
        redirect: false,
      });

      if (response?.error) {
        setError("Invalid credentials");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (_error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      await axios.post("/api/register", data);

      const loginResponse = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (loginResponse?.error) {
        setError("Failed to sign in after registration");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      {/* Header with gradient background */}
      <div className="auth-form-header">
        <div className="auth-form-logo">
          <div className="auth-form-logo-icon">D</div>
          <span className="auth-form-logo-text">DapDip</span>
        </div>
        <h1 className="auth-form-title">
          {variant === "LOGIN" ? "Welcome back" : "Join DapDip"}
        </h1>
        <p className="auth-form-subtitle">
          {variant === "LOGIN"
            ? "Sign in to continue your experience"
            : "Create an account to get started"}
        </p>
      </div>

      <div className="auth-form-content">
        {variant === "LOGIN" ? (
          <form
            onSubmit={loginForm.handleSubmit(onLoginSubmit)}
            style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}
            className={isClient ? "slide-in" : ""}>
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-form-label">
                Email
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="email"
                  type="email"
                  disabled={isLoading}
                  placeholder="email@example.com"
                  className="auth-input"
                  {...loginForm.register("email")}
                />
                <div className="auth-input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
              </div>
              {loginForm.formState.errors.email && (
                <p className="auth-error-text">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="auth-form-group">
              <label htmlFor="password" className="auth-form-label">
                Password
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="password"
                  type="password"
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="auth-input"
                  {...loginForm.register("password")}
                />
                <div className="auth-input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              {loginForm.formState.errors.password && (
                <p className="auth-error-text">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="auth-error-container">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="auth-button"
            >
              {isLoading ? (
                <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg className="auth-loading-icon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style={{opacity: '0.25'}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path style={{opacity: '0.75'}} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        ) : (
          <form
            onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
            style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}
            className={isClient ? "slide-in" : ""}>
            <div className="auth-form-row">
              <div className="auth-form-group">
                <label htmlFor="name" className="auth-form-label">
                  Full Name
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="name"
                    type="text"
                    disabled={isLoading}
                    placeholder="John Doe"
                    className="auth-input"
                    {...registerForm.register("name")}
                  />
                  <div className="auth-input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {registerForm.formState.errors.name && (
                  <p className="auth-error-text">{registerForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="auth-form-group">
                <label htmlFor="username" className="auth-form-label">
                  Username
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="username"
                    type="text"
                    disabled={isLoading}
                    placeholder="johndoe"
                    className="auth-input"
                    {...registerForm.register("username")}
                  />
                  <div className="auth-input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {registerForm.formState.errors.username && (
                  <p className="auth-error-text">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="email" className="auth-form-label">
                Email
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="email"
                  type="email"
                  disabled={isLoading}
                  placeholder="email@example.com"
                  className="auth-input"
                  {...registerForm.register("email")}
                />
                <div className="auth-input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
              </div>
              {registerForm.formState.errors.email && (
                <p className="auth-error-text">
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="auth-form-group">
              <label htmlFor="password" className="auth-form-label">
                Password
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="password"
                  type="password"
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="auth-input"
                  {...registerForm.register("password")}
                />
                <div className="auth-input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              {registerForm.formState.errors.password && (
                <p className="auth-error-text">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="auth-error-container">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="auth-button"
            >
              {isLoading ? (
                <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg className="auth-loading-icon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style={{opacity: '0.25'}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path style={{opacity: '0.75'}} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        )}

        <div className={`auth-divider ${isClient ? "slide-in-delay-1" : ""}`}>
          <div className="auth-divider-line"></div>
          <div className="auth-divider-text">
            <span className="auth-divider-text-span">Or continue with</span>
          </div>
        </div>

        <div className={`auth-social-buttons ${isClient ? "slide-in-delay-2" : ""}`}>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            disabled={isLoading}
            className="auth-social-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            <span className="auth-social-button-text">Google</span>
          </button>

          <button
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/" })}
            disabled={isLoading}
            className="auth-social-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="auth-social-button-text">GitHub</span>
          </button>
        </div>

        <div className={`auth-footer ${isClient ? "slide-in-delay-3" : ""}`}>
          <p className="auth-footer-text">
            {variant === "LOGIN" ? "New to DapDip?" : "Already have an account?"}
            <button
              type="button"
              onClick={toggleVariant}
              className="auth-footer-link"
              disabled={isLoading}
            >
              {variant === "LOGIN" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}