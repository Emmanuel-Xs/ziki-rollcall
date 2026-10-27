"use server";

// Mock of the real server action. There is no database: the vote buttons update
// optimistically in the browser, and returning no fields keeps that state.
export type ToggleVoteResult = {
  error?: string;
  voted?: boolean;
  userVote?: number;
  voteCount?: number;
  likeCount?: number;
  dislikeCount?: number;
};

export async function toggleVoteAction(_bugId: string, _direction: unknown = 1): Promise<ToggleVoteResult> {
  return {};
}
