---
inclusion: always
---

# Tech stack and conventions

## Stack
- Language: TypeScript (strict mode).
- App: Next.js with API routes for frontend and backend.
- Database: SQLite to start, with a lightweight embedding/vector index. Keep data access behind a small repository layer so a move to Postgres later is possible. Choose the specific vector approach in the design spec, and verify it works on the hosting target before committing to it.
- Graph visualization: Cytoscape.js.
- Hosting: Railway with persistent storage for the first public demo. Verify cost and volume limits before relying on it.

## Dataset (undecided, deferred)
- No dataset is chosen. All data work is deferred until the owner explicitly asks for it: research, collection, validation, importer, and the final data model.
- Candidates only, not decisions: BugsJS (JavaScript bugs with patches), or GitHub issues and PRs from a few selected repositories.
- Until then, build the core application against clearly labelled mock/sample data behind a data-access interface, so a real data source can be added later without changing the UI.
- Do not assume any candidate dataset contains the example bug families.

## LLM integration
- Provider-independent interface. Core code never imports a vendor SDK directly. Adapters for OpenAI, Anthropic and AWS Bedrock live behind that interface.
- The provider and model are not chosen yet. Do not hard-code one.
- Cache every LLM response on disk or in the database, keyed by a hash of provider, model, prompt and input. Development and tests should run from the cache wherever possible.
- Keep a small labelled evaluation dataset so changes can be measured without many API calls.
- Validate LLM output against a schema (for example zod). Reject or retry malformed output.
- The LLM must see the changed code, the observed failure and the fix, not only text descriptions.

## Security and config
- Secrets only in environment variables. Never commit `.env`. Keep `.env.example` with variable names only.
- Never log API keys or full prompts containing secrets.
- Validate all API route input at the boundary. Use parameterized queries only.

## Quality
- Unit tests for the repository layer, schema validation and the relationship status logic.
- Property-based tests where they fit, for example relationship status transitions and deduplication of candidate pairs.
- Keep changes small and scoped. No new dependencies without a stated reason.

## Kiro and repo rules
- `.kiro/` must stay committed and must never be added to `.gitignore`.
- Keep a running note of how Kiro features were used (specs, steering, hooks, MCP, powers) for the submission write-up.
- Disclose pre-existing work in the README. The concept and GOAL.md exist outside the application code. Their origin and dates are unverified. Do not claim they predate or postdate the submission period until the owner confirms the dates.
- Do not start the data pipeline, dataset investigation or importer unless the owner explicitly asks.
