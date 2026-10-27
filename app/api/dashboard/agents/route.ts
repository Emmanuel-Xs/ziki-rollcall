import { NextResponse } from "next/server";
import { mockAgents } from "@/lib/mock-data";

// The dashboard's "Your agents" table polls this. In the demo it just returns the mock agents.
export function GET() {
  const agents = mockAgents(new Date()).map((agent) => ({
    ...agent,
    lastSeenAt: agent.lastSeenAt ? agent.lastSeenAt.toISOString() : null,
  }));
  return NextResponse.json({ agents }, { headers: { "Cache-Control": "no-store" } });
}
