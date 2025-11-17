This document defines how you, the coding agent, should behave when working in this repository.

Your goal:
**Write code like an elite software engineer** — clear, maintainable, well-designed, and well-tested — with minimal but meaningful comments.

---

## 1. Overall Philosophy

1. **Clarity over cleverness**

   * Prefer code that is easy to understand for a future engineer reading it at 2am.
   * Avoid “smart” one-liners if they reduce readability.

2. **Small, composable units**

   * Write small, focused functions and classes.
   * Each unit should have a single clear responsibility.

3. **Consistency over personal preference**

   * Follow the existing style of the repository.
   * Use the same patterns, libraries, and idioms already in use, unless they are clearly harmful.

4. **No cargo-culting**

   * Do not copy patterns or frameworks just because they are fashionable.
   * Always be able to justify a design choice briefly in terms of:

     * readability
     * testability
     * extensibility
     * performance (if relevant)

---

## 2. Code Style & Structure

1. **Naming**

   * Use descriptive, intention-revealing names:

     * Good: `fetchUserProfile`, `calculateChecksum`, `OrderRepository`
     * Bad: `doStuff`, `handleData`, `x1`, `tmp2`
   * Prefer clarity over brevity: slightly longer but explicit names are good.

2. **Functions & methods**

   * Keep functions short and focused.
   * Avoid long parameter lists; group related data into objects or structs when appropriate.
   * Push side effects to the edges; keep core logic as pure as reasonably possible.

3. **Modules & files**

   * Group code by domain and responsibility, not by technical type only.
   * Avoid “god files” or “god classes” that do everything.
   * When adding new files, choose a location that fits the existing structure.

4. **Abstractions**

   * Don’t over-abstract prematurely.
   * Extract abstractions only when:

     * The pattern appears at least twice and will likely appear again, **and**
     * The abstraction improves readability and testability.

5. **Branching**
   * Avoid the 'else' keyword. 
     * Prefer using guard conditions and exit early

6. **Function style**
   * Prefer '.map' and other functional style methods over imperative constructs in languages where it is available.

---

## 3. Comments & Documentation

**Goal: as few comments as possible, but as many as necessary.**

1. **What *not* to do**

   * Do **not** write comments that just restate the code:

     * ❌ `// increment i` above `i++`
     * ❌ `// get user by id` above `getUserById(id)`
   * Do **not** generate huge comment blocks for obvious code.
   * Do **not** leave `TODO` without context (who, what, why, by when).

2. **What to comment**

   * Use comments to explain:

     * *Why* something is done in a non-obvious way.
     * Business rules, invariants, and constraints that are not obvious from the code.
     * Workarounds for bugs/limitations in external systems, with links if possible.
   * Prefer concise comments focused on intent and rationale.

3. **API / public surface**

   * For public APIs, modules, or classes, provide brief docstrings / comments that explain:

     * What it does
     * Key parameters and return values
     * Important side effects or invariants

---

## 4. Testing Expectations

You should assume **every meaningful behavior must be testable and tested.**

1. **When adding features**

   * Add or update tests that cover:

     * The main happy path.
     * Important edge cases (null/missing, empty, boundary values).
     * Error paths where applicable.
   * Prefer fast unit tests over heavy integration tests unless integration is the main risk.

2. **When fixing bugs**

   * First, write a test that reproduces the bug and fails.
   * Then fix the bug.
   * Confirm that the new test now passes.

3. **Test quality**

   * Tests should be:

     * Readable and intention-revealing (arrange–act–assert structure).
     * As isolated as possible.
     * Deterministic (no flaky behavior, no reliance on real time or external network unless absolutely necessary).

4. **Coverage**

   * Aim for high coverage of critical business logic.
   * Do not write tests only to increase coverage numbers:

     * Focus on meaningful behavior and edge cases.

---

## 5. Error Handling, Logging, and Robustness

1. **Error handling**

   * Fail fast on programmer errors (e.g. impossible states) where appropriate.
   * Handle expected runtime failures gracefully (I/O errors, invalid user input, external service failures).
   * Surface errors with helpful messages for debugging.

2. **Logging**

   * Log at appropriate levels (info/warn/error) following existing patterns in the repo.
   * Do **not** spam logs with low-value messages.
   * Logs should provide enough context to diagnose issues:

     * key IDs
     * operation names
     * high-level outcomes
   * Avoid logging sensitive data.

3. **Defensive coding**

   * Validate inputs at boundaries (e.g. APIs, public methods).
   * Keep core logic as simple and assumption-based as possible, with validation at the edges.

---

## 6. Working With Existing Code

1. **Respect the current architecture**

   * Before adding a new pattern, check how similar problems are solved elsewhere in the repo.
   * Prefer extending existing patterns instead of introducing new, conflicting ones.

2. **Refactoring**

   * When touching messy code, consider making small, incremental improvements:

     * Extract helper functions
     * Rename misleading variables
     * Simplify logic
   * Do not perform large refactors that are unrelated to the current task unless explicitly requested.

3. **Backward compatibility**

   * Be careful not to break public APIs or widely-used interfaces without a clear migration path.
   * If a breaking change is necessary, clearly document it and update all usages in the repo.

---

## 7. Performance & Complexity

1. **Default stance**

   * Prefer simple solutions first.
   * Only optimize when:

     * There is a demonstrated problem or clear risk, and
     * The optimization doesn’t severely harm readability.

2. **Complexity**

   * Keep cyclomatic complexity low.
   * Break down complex branches or deeply nested conditionals into smaller functions.

3. **Data structures & algorithms**

   * Choose appropriate data structures for the problem.
   * Avoid O(n²) or worse algorithms on large collections unless constrained by the problem size.

---

## 8. Git, Diffs, and Explanations

1. **Minimal diffs**

   * Avoid unnecessary reformatting or style changes that create noisy diffs.
   * Only touch the lines you need, plus small, clearly beneficial cleanups.

2. **Commit / change description (if asked)**

   * Be able to briefly describe:
     * What changed
     * Why it changed
     * Any trade-offs or alternative approaches considered
   * Follow the repo's git message pattern
   * If there's none, follow the Conventional Commit style.

---

## 9. Things You **Must Not** Do

* Do not introduce new major dependencies or frameworks without clear justification.
* Do not auto-generate huge boilerplate blocks unless they are idiomatic and expected for the stack.
* Do not leave dead code, commented-out code blocks, or unused parameters.
* Do not add “explanatory” comments that simply mirror the code.
* Do not ignore failing tests; if you must change tests, explain why.

---

## 10. How to Approach a Task

When asked to implement or change something, follow this mental checklist:

1. **Understand the requirement**

   * Restate the goal in your own words (internally).
   * Identify inputs, outputs, constraints, and edge cases.

2. **Inspect existing code**

   * Look for similar patterns or features already implemented.
   * Reuse and extend existing abstractions when sensible.

3. **Design first**

   * Sketch a simple design:

     * What functions/classes are needed?
     * Where should the code live?
     * How will it be tested?
   * Prefer the simplest design that can work and is easy to extend.

4. **Implement**

   * Write clear, straightforward code.
   * Keep functions small and focused.
   * Add comments only where they clarify intent or non-obvious decisions.

5. **Test**

   * Write or update tests to cover the new behavior and edge cases.
   * Run tests (conceptually) and ensure they pass.

6. **Review your own work**

   * Re-read the code as if you’re another engineer:

     * Is it obvious what it does?
     * Is anything confusing, overly clever, or fragile?
   * Simplify where possible.

7. **Review your work with the user**

   * Use your tools to ask for review and iterate on the feedback.

---

You should follow this guide whenever you modify or create code in this repository.
If the repository’s own conventions contradict this file, **prefer the repository’s conventions**, but still aim for clarity, maintainability, and solid tests.
