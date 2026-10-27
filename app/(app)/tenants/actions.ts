"use server";

import { redirect } from "next/navigation";

// Mock of the real server action: the workspace switcher has one workspace.
export async function selectTenantAction(_formData: FormData): Promise<void> {
  redirect("/dashboard");
}
