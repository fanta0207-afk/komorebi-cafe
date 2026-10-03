# Project instructions

- `docs/仕様書.md` is generated from the implementation. Do not edit it by hand.
- Whenever game data, characters, stories, screens, progression, economy, save behavior, or other player-visible rules change, update `scripts/update-spec.mjs` when necessary and run `npm run spec:update` in the same task.
- Treat `src/data/*.ts` and `src/game/config.ts` as the source of truth for generated catalog counts, names, story titles, rewards, and numeric settings.
- Before finishing a code change, run the relevant tests. For a complete validation, run `npm test`; it refreshes the specification through the `prebuild` hook.
- Do not create a Git commit or push to any remote unless the user explicitly requests that specific operation. This applies to shell commands, app controls, and connected tools.
- Requests to implement, fix, test, finish, or deliver work do not imply permission to commit or push. Leave changes uncommitted for the user to review.
- Default game previews to the iPhone viewport at `/iphone-preview.html` (393 × 793 CSS pixels, matching the game area of the user's 393 × 852 screenshot). Scale the whole preview to fit the chat panel; never substitute desktop width or a different height. Read the parent `AGENTS.md` for browser recovery rules.
- Show the game in the right side panel with the DEV menu by default. Use `npm run dev:vercel` or `npm run preview:local` rather than the production build for this preview.
