import "./settings-design.css";
import Link from "next/link";
import { ThemeSettings } from "@/components/theme-settings";
import { KeyboardShortcutSettings } from "@/components/keyboard-shortcut-settings";
import { RollCallSetting } from "@/components/roll-call/RollCallSetting";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { cookies } from "next/headers";

/* Distinct browser-tab title; the root layout appends "· Ziki". */
export const metadata = { title: "Settings" };

// The real Settings page, with its sections. Only Preferences has content in
// this demo; it is where the Agent roll call switch lives.
const SECTIONS = [
  {
    id: "account",
    label: "Account",
    hint: "Profile, wallet, security",
    icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  {
    id: "prefs",
    label: "Preferences",
    hint: "Theme, emails, shortcuts",
    icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  },
  {
    id: "agents",
    label: "Agents & API",
    hint: "Agents, team, integrations",
    icon: "M4 8h16v12H4zM12 4v4M9 14h.01M15 14h.01",
  },
  {
    id: "data",
    label: "Data & privacy",
    hint: "Export or delete account",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function parseSection(value: string | string[] | undefined): SectionId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "prefs" || raw === "agents" || raw === "data" || raw === "account") return raw;
  return "prefs";
}

const card =
  "rounded-[20px] border border-zk-border bg-zk-surface p-6 flex flex-col gap-4";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const section = parseSection((await searchParams).section);
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <div className="settings-page settings-design mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10">
      <div className="flex flex-col gap-2.5">
        <Link
          href="/issues"
          className="inline-flex min-h-8 items-center gap-1.5 self-start text-sm font-semibold text-zk-accent hover:underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to issues
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em] text-zk-text">Settings</h1>
        <p className="m-0 text-sm text-zk-muted">Manage your profile, preferences, agents and data.</p>
      </div>

      <div className="settings-layout">
        <nav
          aria-label="Settings sections"
          className="settings-navigation"
        >
          {SECTIONS.map((item) => {
            const on = section === item.id;
            return (
              <Link
                key={item.id}
                href={`/settings?section=${item.id}`}
                aria-current={on ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-zk-text transition ${
                  on ? "bg-zk-tint" : "bg-transparent hover:bg-zk-chip"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    on ? "bg-electric-blue-strong text-white" : "bg-zk-chip text-zk-text2"
                  }`}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={item.icon} />
                  </svg>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-bold">{item.label}</span>
                  <span className="text-xs font-medium text-zk-muted">{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="settings-content flex min-w-0 flex-col gap-5">
          {section === "prefs" ? (
            <div className="flex flex-col gap-4">
              <section className={card}>
                <div className="flex flex-col gap-1">
                  <h2 className="m-0 text-lg font-bold text-zk-text">Appearance</h2>
                  <span className="text-[13px] text-zk-muted">
                    Saved to your account, so it follows you to every device.
                  </span>
                </div>
                <ThemeSettings initialTheme={theme} />
              </section>

              <section className={card}>
                <RollCallSetting />
              </section>

              <section className={card}>
                <KeyboardShortcutSettings initialEnabled />
              </section>
            </div>
          ) : (
            <section className={card}>
              <h2 className="m-0 text-lg font-bold text-zk-text">Not part of this demo</h2>
              <p className="m-0 text-sm text-zk-muted">
                Only Preferences is here. It has the Agent roll call switch.
              </p>
              <Link
                href="/settings?section=prefs"
                className="inline-flex min-h-10 items-center self-start text-sm font-bold text-zk-accent hover:underline"
              >
                Go to Preferences
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
