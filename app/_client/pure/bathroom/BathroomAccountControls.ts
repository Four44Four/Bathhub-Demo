/** Which existence-vote controls the bathroom page shows. */
export function bathroomExistenceVoteControlMode(input: {
  interactionLocked: boolean;
  voteOnCooldown: boolean;
}): "locked" | "edit" | "choices" {
  if (input.interactionLocked) {
    return "locked";
  }
  if (input.voteOnCooldown) {
    return "edit";
  }
  return "choices";
}

/** Which rating controls the bathroom page shows. */
export function bathroomRatingControlMode(input: {
  interactionLocked: boolean;
  hasRating: boolean;
}): "locked" | "edit" | "post" {
  if (input.interactionLocked) {
    return "locked";
  }
  if (input.hasRating) {
    return "edit";
  }
  return "post";
}

/**
 * The comment box is only for composing or actively editing.
 * Idle rated state keeps Edit/Delete and hides the input.
 */
export function bathroomCommentInputVisible(ratingControl: "locked" | "edit" | "post"): boolean {
  return ratingControl === "post";
}

/** Stored comment text for this account, or an empty string. */
export function bathroomOwnCommentText(
  comments: readonly { accountId: string; content: string }[],
  accountId: string | null,
): string {
  if (accountId == null) {
    return "";
  }
  return (
    comments.find((comment) => comment.accountId === accountId)?.content ?? ""
  );
}
