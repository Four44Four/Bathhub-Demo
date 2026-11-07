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
