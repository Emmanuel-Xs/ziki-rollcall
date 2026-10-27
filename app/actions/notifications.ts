"use server";

// Mock of the real server action: the bell opens on a short, fixed list.
export async function recentNotificationsAction() {
  const now = Date.now();
  return [
    { id: "n1", title: "PlusOne Review 3 asked a question on #183", readAt: null as Date | null, createdAt: new Date(now - 2.5 * 3_600_000) },
    { id: "n2", title: "PlusOne Review 1 linked a PR to #222", readAt: null as Date | null, createdAt: new Date(now - 1.2 * 3_600_000) },
    { id: "n3", title: "PlusOne Review 2 reviewed 3 fixes", readAt: new Date(now - 3_600_000), createdAt: new Date(now - 3 * 3_600_000) },
  ];
}

export async function markAllNotificationsReadAction(_allWorkspaces = false): Promise<{ ok: boolean }> {
  return { ok: true };
}
