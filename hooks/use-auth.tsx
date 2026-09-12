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
  netlifySignup,
  netlifyLogin,
  netlifyRecover,
} from "@/lib/auth";
import { api } from "@/lib/api-client";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isNetlify: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  recover: (email: string) => Promise<void>;
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
  const isNetlify = isNetlifyIdentityConfigured();

  // On mount: hydrate existing session, or auto-create a local guest so the
  // app is immediately usable in preview/dev.
  useEffect(() => {
    let active = true;
    (async () => {
      // First check if the Netlify Identity widget has a logged-in user.
      if (isNetlify && typeof window !== "undefined") {
        // The widget stores the user + token in localStorage.
        try {
          const widgetUser = localStorage.getItem("netlify-identity-user");
          const widgetToken = localStorage.getItem("netlify-identity-token");
          if (widgetUser && widgetToken) {
            const parsed = JSON.parse(widgetUser);
            const tokenParsed = JSON.parse(widgetToken);
            const u: AuthUser = {
              id: parsed.id,
              email: parsed.email,
              name: parsed.user_metadata?.full_name || null,
              netlifyId: parsed.id,
            };
            storeAuthUser(u);
            localStorage.setItem("polyglot_auth_token", tokenParsed.access_token || tokenParsed);
            if (active) {
              setUser(u);
              setLoading(false);
            }
            api.get("/api/auth/me").catch(() => {});
            return;
          }
        } catch {
          /* ignore parse errors */
        }
      }

      const existing = getStoredAuthUser();
      if (existing) {
        if (active) {
          setUser(existing);
          setLoading(false);
        }
        // Ping the server to ensure the DB user exists
        api.get("/api/auth/me").catch(() => {});
        return;
      }
      // No stored session → create a local guest automatically
      if (!isNetlify) {
        const guest = getOrCreateLocalGuest();
        storeAuthUser(guest);
        if (active) {
          setUser(guest);
          setLoading(false);
        }
        api.get("/api/auth/me").catch(() => {});
      } else {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isNetlify]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isNetlify) {
      const token = await netlifyLogin(email, password);
      const u: AuthUser = {
        id: token.user.id,
        email: token.user.email,
        name: token.user.user_metadata?.full_name || null,
        netlifyId: token.user.id,
      };
      storeAuthUser(u);
      // Store the JWT so API requests can be authenticated server-side.
      if (typeof window !== "undefined") {
        localStorage.setItem("polyglot_auth_token", token.access_token);
      }
      setUser(u);
      await api.get("/api/auth/me");
    } else {
      // Local mode: derive a user from the email
      const u: AuthUser = {
        id: "local_" + btoa(email).replace(/[^a-z0-9]/gi, "").slice(0, 12),
        email,
        name: email.split("@")[0],
      };
      storeAuthUser(u);
      setUser(u);
      await api.get("/api/auth/me");
    }
  }, [isNetlify]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (isNetlify) {
        await netlifySignup(email, password, name);
        // Netlify Identity may require email confirmation — try to log in.
        try {
          await signIn(email, password);
        } catch {
          /* confirmation likely required */
        }
      } else {
        await signIn(email, password);
      }
    },
    [isNetlify, signIn]
  );

  const recover = useCallback(async (email: string) => {
    if (isNetlify) await netlifyRecover(email);
  }, [isNetlify]);

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
    }
    if (isNetlify) {
      // Best-effort logout via the global Netlify Identity widget (loaded in layout).
      const w = typeof window !== "undefined" ? (window as unknown as { netlifyIdentity?: { logout?: () => void } }).netlifyIdentity : undefined;
      if (w && typeof w.logout === "function") w.logout();
      setUser(null);
    } else {
      const guest = getOrCreateLocalGuest();
      storeAuthUser(guest);
      setUser(guest);
    }
  }, [isNetlify]);

  return (
    <AuthContext.Provider
      value={{ user, loading, isNetlify, signIn, signUp, recover, continueAsGuest, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
