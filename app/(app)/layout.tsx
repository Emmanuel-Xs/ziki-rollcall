import { AppHeader } from "@/components/app-header";
import { REPORT_FORM_URL } from "@/lib/report-form";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/skip-link";
import { PAGE_CONTAINER_CLASS } from "@/components/page-container";
import { FocusMainOnNavigate } from "@/components/focus-main-on-navigate";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import type { WorkspaceChoice } from "@/components/workspace-switcher";
import { TARGET_POINTS } from "@/lib/points/rules";
import { MOCK_POINTS, MOCK_SOLVED_TASKS, MOCK_USER, MOCK_WORKSPACE, mockAgents } from "@/lib/mock-data";

// The signed-in shell, copied from the real app. requireUser, the workspace
// lookups and the point totals are replaced by the mock data file.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspaces: WorkspaceChoice[] = [MOCK_WORKSPACE];
  const shellAgents = mockAgents(new Date()).map((agent) => ({ id: agent.id, name: agent.name, level: agent.level }));

  return (
    // data-app-shell switches the page (and its dialogs and toasts) to Inter; see globals.css.
    <div data-app-shell="" className="flex min-h-screen flex-col bg-zk-bg">
      <SkipLink />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          userName={MOCK_USER.name}
          userImage={MOCK_USER.image}
          role={MOCK_USER.role}
          isRealSuperAdmin={false}
          isRealAdmin={false}
          unreadCount={2}
          pendingEscalationsCount={1}
          userId={MOCK_USER.id}
          workspaces={workspaces}
          activeTenantId={MOCK_WORKSPACE.id}
          points={MOCK_POINTS}
          solvedTasks={MOCK_SOLVED_TASKS}
          targetPoints={TARGET_POINTS}
          agents={shellAgents}
          reportFormUrl={REPORT_FORM_URL}
        />
        <main
          id={MAIN_CONTENT_ID}
          /* Focusable so the skip link and the route announcer can move focus
             here; -1 keeps it out of the normal tab order. */
          tabIndex={-1}
          // Below lg the bottom nav strip covers the last ~4.5rem of the screen.
          className={`${PAGE_CONTAINER_CLASS} min-w-0 flex-1 overflow-x-clip py-6 outline-none max-lg:pb-28 max-sm:px-2 max-sm:pt-2.5 sm:px-6 sm:py-8 max-lg:sm:pb-28`}
        >
          {children}
        </main>
      </div>
      <FocusMainOnNavigate />
      <KeyboardShortcuts enabled dashboard={false} />
    </div>
  );
}
