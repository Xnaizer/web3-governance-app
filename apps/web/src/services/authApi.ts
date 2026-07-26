import { api } from "../lib/api";
import type { AuthUser, UpdateProfileInput } from "../types/auth";

interface Envelope<T> {
  data: T;
  error: string | null;
  meta: Record<string, unknown>;
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
  turnstileToken?: string;
}) {
  const res = await api.post<Envelope<string>>("/auth/register", input);
  return res.data.data;
}

export async function verifyEmail(token: string) {
  const res = await api.get<Envelope<string>>("/auth/verify-email", {
    params: { token },
  });
  return res.data.data;
}

export async function login(input: {
  identifier: string;
  password: string;
  turnstileToken?: string;
}) {
  const res = await api.post<Envelope<{ token: string }>>("/auth/login", input);
  return res.data.data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function getMe() {
  const res = await api.get<Envelope<AuthUser>>("/auth/me");
  return res.data.data;
}

export async function updateProfile(input: UpdateProfileInput) {
  const res = await api.patch<Envelope<AuthUser>>("/auth/me", input);
  return res.data.data;
}

export async function resendVerification(
  email: string,
  turnstileToken?: string,
) {
  const res = await api.post<Envelope<string>>("/auth/resend-verification", {
    email,
    turnstileToken,
  });
  return res.data.data;
}

export async function forgotPassword(email: string, turnstileToken?: string) {
  const res = await api.post<Envelope<string>>("/auth/forgot-password", {
    email,
    turnstileToken,
  });
  return res.data.data;
}

export async function resetPassword(
  token: string,
  newPassword: string,
  turnstileToken?: string,
) {
  const res = await api.post<Envelope<string>>("/auth/reset-password", {
    token,
    newPassword,
    turnstileToken,
  });
  return res.data.data;
}
