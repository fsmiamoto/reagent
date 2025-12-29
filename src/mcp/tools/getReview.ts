import type { ReviewResult } from "../../models/domain";
import type { GetReviewInput, GetReviewResult } from "../../models/api";
import { apiFacade } from "../../http/facade";

/**
 * Get review status/results via the HTTP API.
 */
export async function getReview(
  input: GetReviewInput,
): Promise<ReviewResult | GetReviewResult> {
  const { sessionId, wait = true } = input;

  console.error(
    `[Reagent] Getting review ${sessionId} via API (wait: ${wait})`,
  );

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const session = await apiFacade.get<{
        id: string;
        status: "pending" | "approved" | "changes_requested" | "cancelled";
        generalFeedback: string;
        comments: Array<{
          id: string;
          filePath: string;
          startLine: number;
          endLine: number;
          side: "old" | "new";
          text: string;
          createdAt: Date;
        }>;
      }>(`/sessions/${sessionId}`);

      if (!wait || session.status !== "pending") {
        const result: GetReviewResult = {
          status: session.status,
        };

        if (
          session.status === "approved" ||
          session.status === "changes_requested"
        ) {
          result.generalFeedback = session.generalFeedback;
          result.comments = session.comments;
          result.timestamp = new Date();

          console.error(
            `[Reagent] Review completed: ${session.status}, ` +
              `${session.comments.length} comment(s)`,
          );
          return result;
        }

        console.error(`[Reagent] Review status: ${session.status}`);
        return result;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Reagent] Failed to get review:", message);
    throw error;
  }
}
