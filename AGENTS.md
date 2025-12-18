# Agent Instructions for Reagent

## Build/Test Commands
- `npm run build` - Build both server and UI
- `npm run build:server` - Build TypeScript server only
- `npm run build:ui` - Build React UI only
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `vitest run tests/path/to/file.test.ts` - Run single test file

## Code Style
- **TypeScript**: Strict mode enabled with ES2022 target. Use explicit types, avoid `any`.
- **Imports**: Use ES module imports without file extensions. Group by: external deps, then local with `../` paths.
- **Naming**: Descriptive names (e.g., `getReviewFilesFromGit`, `ReviewSession`). Use camelCase for functions/vars, PascalCase for classes/types.
- **Functions**: Small, focused, single responsibility. Avoid `else` keyword - use guard clauses and early returns. Prefer functional methods (`.map`, `.filter`) over imperative loops.
- **Error Handling**: Use try-catch with descriptive error messages. Log to stderr with `console.error('[Reagent] ...')`.
- **Comments**: Minimal. Only explain *why* for non-obvious logic, business rules, or workarounds. JSDoc for public APIs with parameters/returns.
- **Testing**: Write tests for all features (happy path + edge cases). Use Vitest with arrange-act-assert pattern. Tests in `tests/` directory.
- **Validation**: Use Zod schemas for runtime validation at boundaries (API inputs, external data).

Follow existing patterns in the codebase. Prefer clarity over cleverness.
