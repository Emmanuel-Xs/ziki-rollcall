import { redirect } from "next/navigation";

// The real app's home page is a marketing page; the demo opens on the dashboard.
export default function Home() {
  redirect("/dashboard");
}
