// Auth: Netlify Identity (GoTrue) integration with a local guest fallback.
//
// - If NEXT_PUBLIC_NETLIFY_IDENTITY_URL is set, auth talks to the Netlify
//   Identity GoTrue endpoint (signup/login/logout/recover).
// - Otherwise, a local guest user is used (stored in localStorage) so the
//   app is fully functional in development / preview without Netlify Identity.
//
// The client reports the resolved user via the `x-user-id` header; the server
// scopes all data by that user and creates the DB user on first sight.

import { db } from "./db";

export interface AuthUser {
  id: string; // our DB user id
  email: string;
  name: string | null;
  netlifyId?: string | null;
}

const LOCAL_GUEST_KEY = "polyglot_guest_user";
const AUTH_USER_KEY = "polyglot_auth_user";

export function isNetlifyIdentityConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_NETLIFY_IDENTITY_URL;
}

export function getIdentityUrl(): string {
  // Netlify Identity's GoTrue API lives at /.netlify/identity/*
  // NEXT_PUBLIC_NETLIFY_IDENTITY_URL should be the site URL (e.g.
  // https://your-site.netlify.app). We append the GoTrue path here.
  const base = (process.env.NEXT_PUBLIC_NETLIFY_IDENTITY_URL || "").replace(/\/$/, "");
  return `${base}/.netlify/identity`;
}

// ---- Client-side auth helpers ----

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function storeAuthUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function getOrCreateLocalGuest(): AuthUser {
  if (typeof window === "undefined") {
    return { id: "guest", email: "guest@local", name: "Guest" };
  }
  let raw = localStorage.getItem(LOCAL_GUEST_KEY);
  if (!raw) {
    const id = "guest_" + Math.random().toString(36).slice(2, 10);
    const guest: AuthUser = {
      id,
      email: "guest@polyglot.local",
      name: "Guest",
    };
    localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
    raw = JSON.stringify(guest);
  }
  return JSON.parse(raw) as AuthUser;
}

// GoTrue API calls --------------------------------------------------

interface GoTrueUser {
  id: string;
  email: string;
  user_metadata?: { full_name?: string };
  app_metadata?: Record<string, unknown>;
}

interface GoTrueTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: GoTrueUser;
}

async function gotrueFetch(path: string, opts: RequestInit = {}) {
  const base = getIdentityUrl();
  if (!base) throw new Error("Netlify Identity URL is not configured");
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body.error_description || body.msg || body.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res;
}

export async function netlifySignup(
  email: string,
  password: string,
  name: string
): Promise<{ user: GoTrueUser }> {
  const res = await gotrueFetch("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, user_metadata: { full_name: name } }),
  });
  return { user: await res.json() };
}

export async function netlifyLogin(
  email: string,
  password: string
): Promise<GoTrueTokenResponse> {
  const res = await gotrueFetch("/token", {
    method: "POST",
    body: JSON.stringify({ grant_type: "password", username: email, password }),
  });
  return res.json();
}

export async function netlifyRecover(email: string): Promise<void> {
  await gotrueFetch("/recover", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function netlifyCurrentUser(
  token: string
): Promise<GoTrueUser | null> {
  try {
    const res = await gotrueFetch("/user", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch {
    return null;
  }
}

// ---- Server-side user resolution ----

export async function resolveServerUser(headers: Headers): Promise<AuthUser> {
  const userId = headers.get("x-user-id");
  const email = headers.get("x-user-email") || "guest@polyglot.local";
  const name = headers.get("x-user-name") || null;
  const netlifyId = headers.get("x-netlify-id") || null;

  if (!userId) {
    // Create / fetch a transient guest for unauthenticated requests.
    return ensureDbUser({
      email,
      name,
      netlifyId,
    });
  }

  // Try to find existing user by id, netlifyId, or email.
  let user = await db.user.findUnique({ where: { id: userId } });
  if (!user && netlifyId) {
    user = await db.user.findUnique({ where: { netlifyId } });
  }
  if (!user) {
    user = await db.user.findUnique({ where: { email } });
  }
  if (!user) {
    try {
      user = await db.user.create({
        data: {
          id: userId,
          email,
          name,
          netlifyId,
        },
      });
    } catch (e) {
      // Race: another concurrent request may have just created this user.
      // Re-fetch by email/netlifyId and return it.
      user =
        (netlifyId
          ? await db.user.findUnique({ where: { netlifyId } })
          : null) ||
        (await db.user.findUnique({ where: { email } })) ||
        user;
      if (!user) throw e;
    }
  } else {
    // Keep email/name/netlifyId in sync.
    const patch: Record<string, string | null> = {};
    if (email && user.email !== email) patch.email = email;
    if (name && user.name !== name) patch.name = name;
    if (netlifyId && user.netlifyId !== netlifyId) patch.netlifyId = netlifyId;
    if (Object.keys(patch).length) {
      user = await db.user.update({ where: { id: user.id }, data: patch });
    }
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    netlifyId: user.netlifyId,
  };
}

export async function ensureDbUser(input: {
  email: string;
  name: string | null;
  netlifyId?: string | null;
}): Promise<AuthUser> {
  let user = input.netlifyId
    ? await db.user.findUnique({ where: { netlifyId: input.netlifyId } })
    : null;
  if (!user) {
    user = await db.user.findUnique({ where: { email: input.email } });
  }
  if (!user) {
    try {
      user = await db.user.create({
        data: {
          email: input.email,
          name: input.name,
          netlifyId: input.netlifyId,
        },
      });
    } catch {
      // Race: re-fetch by email/netlifyId.
      user =
        (input.netlifyId
          ? await db.user.findUnique({ where: { netlifyId: input.netlifyId } })
          : null) ||
        (await db.user.findUnique({ where: { email: input.email } })) ||
        user;
    }
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    netlifyId: user.netlifyId,
  };
}
