import { AxiosError } from "axios";
import { BaseError } from "viem";

export function getErrorMessage(e: unknown): string {
  if (e instanceof BaseError) return e.shortMessage || e.message;
  if (e instanceof AxiosError) return (e.response?.data as { error?: string } | undefined)?.error ?? e.message;
  if (e instanceof Error) return e.message;
  return "Terjadi kesalahan.";
}

export function getErrorStatus(e: unknown): number | undefined {
  return e instanceof AxiosError ? e.response?.status : undefined;
}
