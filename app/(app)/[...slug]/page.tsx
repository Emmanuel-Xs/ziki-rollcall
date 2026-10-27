import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Not part of this demo" };

/**
 * Every page that was not copied from Ziki lands here, so a click in the header
 * never ends on a 404. The demo has the dashboard, the issues list and Settings.
 */
export default function NotInDemoPage() {
  return (
    <div className="mx-auto max-w-xl pt-10">
      <section className="rounded-[20px] border border-zk-border bg-zk-surface px-6 py-10 text-center">
        <h1 className="text-xl font-extrabold tracking-[-0.01em] text-zk-text">Not part of this demo</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zk-muted">
          This is a design demo of Agent Roll Call on a copy of the Ziki UI, with mock data. Only the dashboard, the
          issues list and Settings are here.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-[42px] items-center justify-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white"
          >
            Back to the dashboard
          </Link>
          <Link href="/issues" className="text-sm font-bold text-zk-accent hover:underline">
            Issues
          </Link>
        </div>
      </section>
    </div>
  );
}
