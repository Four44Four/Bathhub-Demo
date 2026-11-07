import { normalizeBathroomCommentContent } from "../../../_shared/bathroom/BathroomCommentContent";
import { profilePictureDataUrl } from "../../../_shared/accounts/ProfileImageUpload";
import { formatSupabaseError } from "../formatSupabaseError";
import { bathroomReadByIdValidationError } from "./ReadBathroomById";

export const LIST_BATHROOM_COMMENTS_RPC_NAME =
  "list_bathroom_data_comments" as const;

export const LIST_BATHROOM_COMMENTS_ERROR_CONTEXT =
  "Failed to list bathroom comments" as const;

export type BathroomComment = {
  accountId: string;
  content: string;
  ratingStars: number | null;
  profilePictureDataUrl: string | null;
};

export type ListBathroomCommentsRpcParams = {
  p_id: number;
};

export type ListBathroomCommentsRpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type ListBathroomCommentsRpc = (
  params: ListBathroomCommentsRpcParams,
) => Promise<ListBathroomCommentsRpcResult>;

export type ClearBathroomRatingChange = {
  /** Replacement comment. Null removes the comment. Ignored when deleting. */
  comment: string | null;
  deleteComment: boolean;
};

export type ClearBathroomRatingRpcParams = {
  p_id: number;
  p_comment?: string;
  p_delete_comment?: boolean;
};

/** Replaces this account's comment in a loaded comment list. Null content removes it. */
export function withOwnBathroomComment(
  comments: readonly BathroomComment[],
  accountId: string,
  content: string | null,
  ratingStars: number | null,
  profilePictureDataUrl: string | null = null,
): BathroomComment[] {
  const previous = comments.find((comment) => comment.accountId === accountId);
  const remaining = comments.filter((comment) => comment.accountId !== accountId);
  if (content === null) {
    return remaining;
  }
  return [
    ...remaining,
    {
      accountId,
      content,
      ratingStars,
      profilePictureDataUrl:
        profilePictureDataUrl ?? previous?.profilePictureDataUrl ?? null,
    },
  ].sort((left, right) => left.accountId.localeCompare(right.accountId));
}

export function buildClearBathroomRatingRpcParams(
  id: number,
  change?: ClearBathroomRatingChange | null,
): ClearBathroomRatingRpcParams {
  if (change == null) {
    return { p_id: id };
  }
  if (change.deleteComment) {
    return { p_id: id, p_delete_comment: true };
  }
  // Null comment means leave the stored comment alone. An empty string would
  // delete it inside write_bathroom_data_comment.
  if (change.comment == null) {
    return { p_id: id };
  }
  return { p_id: id, p_comment: change.comment };
}

export function parseBathroomCommentList(value: unknown): BathroomComment[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const comments: BathroomComment[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object") {
      return null;
    }
    const record = entry as {
      account_id?: unknown;
      content?: unknown;
      rating_stars?: unknown;
      profile_picture_mime?: unknown;
      profile_picture_base64?: unknown;
    };
    if (typeof record.account_id !== "string" || record.account_id.length === 0) {
      return null;
    }
    if (typeof record.content !== "string") {
      return null;
    }
    const content = normalizeBathroomCommentContent(record.content);
    if (content === null) {
      return null;
    }
    const ratingStars = record.rating_stars;
    if (ratingStars !== null && ratingStars !== undefined) {
      if (
        typeof ratingStars !== "number" ||
        !Number.isInteger(ratingStars) ||
        ratingStars < 1 ||
        ratingStars > 5
      ) {
        return null;
      }
    }
    const pictureDataUrl =
      typeof record.profile_picture_mime === "string" &&
      typeof record.profile_picture_base64 === "string"
        ? profilePictureDataUrl(
            record.profile_picture_mime,
            record.profile_picture_base64,
          )
        : null;
    comments.push({
      accountId: record.account_id,
      content,
      ratingStars:
        ratingStars === null || ratingStars === undefined ? null : ratingStars,
      profilePictureDataUrl: pictureDataUrl,
    });
  }
  return comments;
}

export async function listBathroomComments(
  id: number,
  rpc: ListBathroomCommentsRpc,
): Promise<BathroomComment[]> {
  const validationError = bathroomReadByIdValidationError(id);
  if (validationError !== null) {
    throw new Error(
      formatSupabaseError(LIST_BATHROOM_COMMENTS_ERROR_CONTEXT, validationError),
    );
  }

  const { data, error } = await rpc({ p_id: id });
  if (error !== null) {
    throw new Error(
      formatSupabaseError(LIST_BATHROOM_COMMENTS_ERROR_CONTEXT, error.message),
    );
  }

  const parsed = parseBathroomCommentList(data ?? []);
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        LIST_BATHROOM_COMMENTS_ERROR_CONTEXT,
        "invalid bathroom comment payload",
      ),
    );
  }
  return parsed;
}
