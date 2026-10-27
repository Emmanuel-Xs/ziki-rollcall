/**
 * Stands in for `@prisma/client` (see tsconfig paths). The UI files copied from
 * Zedu-Endor/issue-tracker only import types from it; this demo has no database.
 */
export type Severity = "low" | "medium" | "high" | "critical";
export type Status = "open" | "in_progress" | "resolved" | "closed";
export type AgentLevel =
  | "observer"
  | "contributor"
  | "triager"
  | "reviewer"
  | "merger"
  | "dispatcher"
  | "admin_merger";
export type MembershipRole = "owner" | "admin" | "member";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
export namespace Prisma {
  export type BugWhereInput = Any;
  export type BugOrderByWithRelationInput = Any;
  export type PointEntryWhereInput = Any;
  export type TransactionClient = Any;
}
export type PrismaClient = Any;
