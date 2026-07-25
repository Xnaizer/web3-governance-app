import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDisconnect } from "wagmi";
import * as authApi from "../services/authApi";
import type { AuthUser } from "../types/auth";

export function useMe() {
  return useQuery<AuthUser | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await authApi.getMe();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      identifier: string;
      password: string;
      turnstileToken?: string;
    }) => {
      await authApi.login(input);
      return authApi.getMe();
    },
    onSuccess: (me) => qc.setQueryData(["me"], me),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const { disconnect } = useDisconnect();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.setQueryData(["me"], null);
      disconnect(); 
    },
  });
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (input: { email: string; turnstileToken?: string }) =>
      authApi.resendVerification(input.email, input.turnstileToken),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: { email: string; turnstileToken?: string }) =>
      authApi.forgotPassword(input.email, input.turnstileToken),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: {
      token: string;
      newPassword: string;
      turnstileToken?: string;
    }) =>
      authApi.resetPassword(
        input.token,
        input.newPassword,
        input.turnstileToken,
      ),
  });
}
