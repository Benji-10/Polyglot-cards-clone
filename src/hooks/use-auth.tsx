"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/lib/auth";
import {
  getStoredAuthUser,
  storeAuthUser,
  getOrCreateLocalGuest,
  isNetlifyIdentityConfigured,
} from "@/lib/auth";
import { api } from "@/lib/api-client";

// Type for the global netlify-identity-widget
interface NetlifyIdentityWidget {
  open: (mode?: "login" | "signup" | "user") => void;
  close: () => void;
  currentUser: () => {
    id: string;
    email: string;
    user_metadata?: { full_name?: string };
    app_metadata?: Record<string, unknown>;
    token?: { access_token?: string };
  } | null;
  logout: () => void;
  on: (event: string, cb: (user?: unknown) => void) => void;
  off: (event: string, cb: (user?: unknown) => void) => void;
  init: (siteURL: string) => void;
}

declare global {
  interface Window {
    netlifyIdentity?: NetlifyIdentityWidget;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isNetlify: boolean;
  signIn: () => void;
  signUp: () => void;
  continueAsGuest: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNetlify, setIsNetlify] = useState(false);

  // Detect Netlify Identity availability. Re-checks when the widget script loads.
  useEffect(() => {
    const check = () => {
      const detected =
        !!process.env.NEXT_PUBLIC_NETLIFY_IDENTITY_URL ||
        (typeof window !== "undefined" &&
          (window.location.hostname.includes("netlify") ||
            !!window.netlifyIdentity));
      setIsNetlify(detected);
    };
    check();
    // Re-check after a delay in case the async script hasn't loaded yet.
    const t = setTimeout(check, 500);
    const t2 = setTimeout(check, 2000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  // On mount: check for stored session, or auto-create a local guest.
  useEffect(() => {
    let active = true;

    const init = async () => {
      // First check if the Netlify Identity widget has a logged-in user.
      if (isNetlify && typeof window !== "undefined") {
        // Wait for the widget script to load (it's async in the layout).
        const waitForWidget = (retries = 0): Promise<NetlifyIdentityWidget | null> => {
          return new Promise((resolve) => {
            if (window.netlifyIdentity) {
              resolve(window.netlifyIdentity);
              return;
            }
            if (retries > 30) {
              resolve(null);
              return;
            }
            setTimeout(() => resolve(waitForWidget(retries + 1)), 100);
          });
        };

        const widget = await waitForWidget();
        if (widget) {
          // Init the widget with the site URL.
          const siteUrl = process.env.NEXT_PUBLIC_NETLIFY_IDENTITY_URL || "";
          if (siteUrl) {
            try {
              widget.init(siteUrl);
            } catch {
              /* may already be initialised */
            }
          }

          // Check if user is already logged in.
          const widgetUser = widget.currentUser();
          if (widgetUser) {
            const u: AuthUser = {
              id: widgetUser.id,
              email: widgetUser.email,
              name: widgetUser.user_metadata?.full_name || null,
              netlifyId: widgetUser.id,
            };
            storeAuthUser(u);
            const token = widgetUser.token?.access_token;
            if (token) {
              localStorage.setItem("polyglot_auth_token", token);
            }
            if (active) {
              setUser(u);
              setLoading(false);
            }
            api.get("/api/auth/me").catch(() => {});
            return;
          }

          // Listen for login/logout events from the widget.
          const onLogin = (u: unknown) => {
            const widgetUser = u as {
              id: string;
              email: string;
              user_metadata?: { full_name?: string };
              token?: { access_token?: string };
            } | null;
            if (!widgetUser) return;
            const authUser: AuthUser = {
              id: widgetUser.id,
              email: widgetUser.email,
              name: widgetUser.user_metadata?.full_name || null,
              netlifyId: widgetUser.id,
            };
            storeAuthUser(authUser);
            const token = widgetUser.token?.access_token;
            if (token) {
              localStorage.setItem("polyglot_auth_token", token);
            }
            if (active) {
              setUser(authUser);
              setLoading(false);
            }
            api.get("/api/auth/me").catch(() => {});
          };

          const onLogout = () => {
            storeAuthUser(null);
            localStorage.removeItem("polyglot_auth_token");
            if (active) {
              setUser(null);
            }
          };

          widget.on("login", onLogin);
          widget.on("logout", onLogout);

          // On Netlify, if there's a stored REAL user (not guest), use it.
          const stored = getStoredAuthUser();
          if (stored && stored.netlifyId) {
            if (active) {
              setUser(stored);
              setLoading(false);
            }
            api.get("/api/auth/me").catch(() => {});
            return;
          }

          // On Netlify, DON'T auto-use guests — show the landing page.
          // Clear any auto-created guest from the initial false detection.
          storeAuthUser(null);
          if (active) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
      }

      // On Netlify sites (widget not loaded yet), check for a REAL auth user.
      if (isNetlify) {
        const existing = getStoredAuthUser();
        if (existing && existing.netlifyId) {
          if (active) {
            setUser(existing);
            setLoading(false);
          }
          api.get("/api/auth/me").catch(() => {});
          return;
        }
        // No real user — show the landing page. Clear any stale guest.
        storeAuthUser(null);
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      // Local dev: fall back to stored auth user or auto-create a guest.
      const existing = getStoredAuthUser();
      if (existing) {
        if (active) {
          setUser(existing);
          setLoading(false);
        }
        api.get("/api/auth/me").catch(() => {});
        return;
      }

      // No stored session → create a local guest automatically (local dev only).
      const guest = getOrCreateLocalGuest();
      storeAuthUser(guest);
      if (active) {
        setUser(guest);
        setLoading(false);
      }
      api.get("/api/auth/me").catch(() => {});
    };

    init();
    return () => {
      active = false;
    };
  }, [isNetlify]);

  // Sign in: opens the Netlify Identity widget's login modal.
  const signIn = useCallback(() => {
    if (typeof window !== "undefined" && window.netlifyIdentity) {
      window.netlifyIdentity.open("login");
    }
  }, []);

  // Sign up: opens the Netlify Identity widget's signup modal.
  const signUp = useCallback(() => {
    if (typeof window !== "undefined" && window.netlifyIdentity) {
      window.netlifyIdentity.open("signup");
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    const guest = getOrCreateLocalGuest();
    storeAuthUser(guest);
    setUser(guest);
    await api.get("/api/auth/me");
  }, []);

  const signOut = useCallback(() => {
    storeAuthUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("polyglot_auth_token");
      localStorage.removeItem("polyglot_guest_user");
      localStorage.removeItem("netlify-identity-user");
      localStorage.removeItem("netlify-identity-token");
    }
    if (typeof window !== "undefined" && window.netlifyIdentity) {
      try {
        window.netlifyIdentity.logout();
      } catch {
        /* widget may not be ready — ignore */
      }
    }
    if (!isNetlify) {
      const guest = getOrCreateLocalGuest();
      storeAuthUser(guest);
      setUser(guest);
    } else {
      setUser(null);
    }
  }, [isNetlify]);

  return (
    <AuthContext.Provider
      value={{ user, loading, isNetlify, signIn, signUp, continueAsGuest, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
