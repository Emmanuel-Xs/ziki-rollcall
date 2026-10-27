"use server";

import { redirect } from "next/navigation";

// Mock of the real server action: there is no account here, so "Sign out"
// just goes back to the dashboard.
export async function logoutAction() {
  redirect("/dashboard");
}
