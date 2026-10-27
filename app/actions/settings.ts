"use server";

import { cookies } from "next/headers";
import { isTheme, THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "@/lib/theme";

export type SettingsResult = { error?: string; ok?: boolean; emailNotifications?: boolean };

/** Mock: the keyboard-shortcuts switch has nothing to save to. */
export async function setKeyboardShortcutsAction(enabled: unknown): Promise<SettingsResult> {
  if (typeof enabled !== "boolean") return { error: "Invalid setting" };
  return { ok: true };
}

/** Light, dark or follow the device. Kept in a cookie, which is all this demo has. */
export async function setThemeAction(theme: unknown): Promise<SettingsResult> {
  if (!isTheme(theme)) return { error: "Invalid setting" };
  (await cookies()).set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  return { ok: true };
}
