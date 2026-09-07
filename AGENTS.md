# Project instructions

- `docs/仕様書.md` is generated from the implementation. Do not edit it by hand.
- Whenever game data, characters, stories, screens, progression, economy, save behavior, or other player-visible rules change, update `scripts/update-spec.mjs` when necessary and run `npm run spec:update` in the same task.
- Treat `src/data/*.ts` and `src/game/config.ts` as the source of truth for generated catalog counts, names, story titles, rewards, and numeric settings.
- Before finishing a code change, run the relevant tests. For a complete validation, run `npm test`; it refreshes the specification through the `prebuild` hook.
