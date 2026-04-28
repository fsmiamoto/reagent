import type { CompactReviewSessionDetails } from "../../models/domain";
import type { GetReviewInput, GetReviewResult } from "../../models/api";
import { apiFacade } from "../../http/facade";

/** Maximum time to poll before timing out (10 minutes). */
const MAX_POLL_DURATION_MS = 600_000;

/**
 * Get review status/results via the HTTP API.
 */
export async function getReview(
  input: GetReviewInput,
): Promise<GetReviewResult> {
  const { sessionId, wait = true } = input;

  console.error(
    `[Reagent] Getting review ${sessionId} via API (wait: ${wait})`,
  );

  try {
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (wait && elapsed >= MAX_POLL_DURATION_MS) {
        throw new Error(
          `Timed out waiting for review ${sessionId} after ${Math.round(elapsed / 1000)}s`,
        );
      }

      const session = await apiFacade.get<CompactReviewSessionDetails>(
        `/sessions/${sessionId}?compact=true`,
      );

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
