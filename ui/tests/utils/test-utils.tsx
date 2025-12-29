import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { vi } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";

import { useReviewStore } from "../../src/store/reviewStore.js";

type ReviewStore = ReturnType<typeof useReviewStore.getState>;

type RenderWithStoreResult = ReturnType<typeof render> & {
  store: StoreApi<ReviewStore>;
  resetStore: () => void;
};

const createDefaultState = (overrides?: Partial<ReviewStore>): ReviewStore => ({
  session: null,
  selectedFile: null,
  isLoading: false,
  error: null,
  isSubmitting: false,
  loadSession: vi.fn() as ReviewStore["loadSession"],
  setSelectedFile: vi.fn() as ReviewStore["setSelectedFile"],
  addComment: vi.fn() as ReviewStore["addComment"],
  deleteComment: vi.fn() as ReviewStore["deleteComment"],
  updateGeneralFeedback: vi.fn() as ReviewStore["updateGeneralFeedback"],
  completeReview: vi.fn() as ReviewStore["completeReview"],
  ...overrides,
});

export function createMockStore(
  overrides?: Partial<ReviewStore>,
): StoreApi<ReviewStore> {
  return createStore<ReviewStore>(() => createDefaultState(overrides));
}

export function renderWithStore(
  ui: ReactElement,
  store?: StoreApi<ReviewStore>,
  options?: Omit<RenderOptions, "wrapper">,
): RenderWithStoreResult {
  const activeStore = store ?? createMockStore();
  const originalState = useReviewStore.getState();
  const unsubscribe = activeStore.subscribe((nextState) => {
    useReviewStore.setState(nextState, true);
  });

  useReviewStore.setState(activeStore.getState(), true);

  const renderResult = render(ui, options);
  let cleanedUp = false;

  const resetStore = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    unsubscribe();
    useReviewStore.setState(originalState, true);
  };

  const originalUnmount = renderResult.unmount;
  renderResult.unmount = () => {
    resetStore();
    return originalUnmount();
  };

  return {
    ...renderResult,
    store: activeStore,
    resetStore,
  };
}

export * from "@testing-library/react";
