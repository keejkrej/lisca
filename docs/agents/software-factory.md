# Software factory

LiSCA's factory loop is the OpenAI-style pipeline from
[Inside OpenAI's agentic software factory](https://newsletter.pragmaticengineer.com/p/openai-software-factory),
trimmed to what this repo actually runs:

1. A human states the outcome (issue, PRD, or a Grok Build session).
2. An agent implements against `AGENTS.md` / `CONTEXT.md`.
3. GitHub Actions `CI` (`fmt:check` + `check`) is the mechanical gate.
4. **Grok Build reviews every non-draft PR automatically** — no `/review`, no
   `workflow_dispatch`.

CI babysitting (agent retries a red `check` until green) and production
"perf factory" loops are not wired yet.

## Agentic code review

`.github/workflows/grok-review.yml` starts on `opened` / `synchronize` /
`reopened` / `ready_for_review`. It skips drafts and fork PRs (GitHub does not
give secrets to `pull_request` jobs from forks).

Grok reads the PR diff through three lenses (correctness, security, LiSCA
conventions), then `scripts/grok-pr-review.ts` publishes a `COMMENT` review with
inline notes. Bug-severity findings fail the check; suggestions and nits do not.
Set repository variable `GROK_REVIEW_FAIL_ON` to `none` to keep the review
informational.

The Grok step is read-only (`--sandbox read-only`, no `GITHUB_TOKEN`). Posting
uses `GITHUB_TOKEN` in a later step that does not see the Grok session.

## Auth (required)

Use the SuperGrok / Grok Build login already on your machine. Do not put an
xAI console API key in unless you want API billing as a fallback.

1. On a machine where `grok login` works:

   ```sh
   gh secret set GROK_AUTH_JSON --repo keejkrej/lisca < ~/.grok/auth.json
   ```

2. The secret is the **entire** `auth.json` file, including the refresh token.
   GitHub Actions will act as that Grok account. Rotate it with another
   `grok login` + `gh secret set` if reviews start failing with auth errors.

Optional fallback: repository secret `XAI_API_KEY` from
[console.x.ai](https://console.x.ai). Used only when `GROK_AUTH_JSON` is unset.

## Local dry run

```sh
gh pr diff 123 > /tmp/pr.diff
# grok ... --prompt-file scripts/grok-pr-review.prompt.md --json-schema "$(cat scripts/grok-pr-review.schema.json)" > /tmp/grok.json
node --experimental-strip-types scripts/grok-pr-review.ts \
  --review /tmp/grok.json --diff /tmp/pr.diff --pr 123 \
  --commit "$(gh pr view 123 --json headRefOid -q .headRefOid)" \
  --repo keejkrej/lisca --dry-run
```
