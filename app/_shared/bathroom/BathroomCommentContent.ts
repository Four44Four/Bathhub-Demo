/** Confirmation copy for deleting a stored rating, including its comment when one exists. */
export function bathroomDeleteRatingConfirmationMessage(hasComment: boolean): string {
  if (hasComment) {
    return "Delete your rating and comment?";
  }
  return "Delete your rating?";
}

/** Stored comment text, or null when the field is empty. */
export function normalizeBathroomCommentContent(content: string): string | null {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}
