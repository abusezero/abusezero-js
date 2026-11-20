# abusezero

**Abuse prevention API for SaaS**

Prevent users from creating extra accounts to repeatedly claim your trials, free plans, credits, and other benefits.

The official AbuseZero package covers server evaluations, browser protection and the command line.

```sh
npm install abusezero
```

Server calls and the command line require Node 22 or later.

## Server

```ts
import { AbuseZero } from "abusezero/server";

const abusezero = new AbuseZero({ key: process.env.ABUSEZERO_SECRET_KEY!, outage: "throw" });

export async function POST(request: Request) {
  const { email, claimId, deviceToken } = await request.clone().json();
  const evaluation = await abusezero.evaluate(
    { benefit: "pro_trial", claim_id: claimId, subject: { email }, identifiers: { device_token: deviceToken } },
    `claim:${claimId}`,
    { request }, // The incoming request, sent with the evaluation.
  );
  // Act on evaluation.result
}
```

CommonJS uses `require("abusezero/server")`. Keep server imports and SECRET KEYS in your backend. The package has no root import; choose the entry point for your runtime.

On Node, the client keeps its connection to AbuseZero open for up to 50 idle seconds, so occasional evaluations skip opening a new one. When your app routes `fetch` through a proxy, the client sends its requests through `fetch` instead. You can also pass your own `fetch` in the options.

### Scopes

RESTRICTED KEYS use `operations:general`, `operations:configuration` or both. The scopes are independent. Evaluations, evidence, outcome reports, imports, exports, user-history deletion, webhook test events and resending webhook deliveries use `operations:general`. Configuration changes use `operations:configuration`. A SECRET KEY holds both. API keys never hold `operations:management`: it needs an OAuth sign-in or a machine client. See [Scopes](https://docs.abusezero.com/docs/api-reference/authentication#scopes) for the full list.

### Skipped evaluations

When a workspace can't run an evaluation, `evaluate()` and `dryRunEvaluation()` return `{ status: "skipped", reason }` with no `result`. No allow or deny was decided, so handle skips as their own branch in your flow. Your `outage` setting doesn't apply.

| Reason | What it means |
| --- | --- |
| `insufficient_credits` | The workspace doesn't have enough credits for the evaluation. |
| `billing_overdue` | The workspace doesn't have enough credits while a payment is overdue. |
| `service_inactive` | The workspace can't run evaluations right now. |
| `benefit_paused` | The benefit is paused because the workspace is over its plan's limits. |

The workspace owner sees the credit balance and usage against plan limits and buys credits in **Workspace settings → Usage**, manages plans in **Workspace settings → Subscription**, and manages payments in **Workspace settings → Billing**. `usage()` reads the same balance. New reasons can be added within API `v1`, so handle a reason you don't recognize like any other skip.

### Webhooks

```ts
import { verifyWebhook, WebhookVerificationError } from "abusezero/server";

const event = verifyWebhook({
  payload: rawBody, // The request body exactly as received.
  headers: request.headers,
  secret: process.env.ABUSEZERO_WEBHOOK_SECRET!,
});
```

`verifyWebhook()` checks an AbuseZero webhook request and returns its event. It throws `WebhookVerificationError` when the request isn't signed with the endpoint's `whsk_` secret, was changed, or is more than 5 minutes old (`toleranceSeconds` changes this). During a secret rotation, pass both secrets as an array; an entry that isn't set is skipped, so delete the old variable when the rotation ends rather than setting it to an empty value. A secret that isn't a complete `whsk_` signing secret throws a `TypeError` before the request is checked. Reply with a `2xx` status within 10 seconds and process the event afterwards. An event can arrive more than once: skip IDs you already handled.

Add endpoints in **Developers → API & Webhooks → Webhooks**, or with `createWebhookEndpoint()`, then read the endpoint's secret with `webhookSigningSecret()`, which needs an OAuth sign-in or a machine client. The guide is at https://docs.abusezero.com/docs/guides/receive-webhooks.

### Errors

Failed calls throw an `AbuseZeroError` with `code`, `message`, `status`, `requestId`, `retryable` and `docsUrl`, the error code reference's section for the error.

### Public API

`AbuseZeroPublic` reads prices, the developer docs, the API's references and legal documents, and contacts sales or support. It needs no key or sign-in.

```ts
import { AbuseZeroPublic } from "abusezero/server";

const abusezero = new AbuseZeroPublic();
const quote = await abusezero.priceQuote({ plan: "pro", interval: "year" });
```

Every method is listed at https://docs.abusezero.com/docs/tools/server-sdk#public-api.
### Account status and events

```ts
const integration = await abusezero.integrationStatus();

for await (const page of abusezero.followEvents({ cursor: savedCursor })) {
  // Handle page.data, then save page.next_cursor.
}
```

`accountStatus()` reads the workspace's credits, plan, limits and auto-reload. `integrationStatus()` says whether keys, the browser script, evaluations, outcome reports, webhooks and credits are working, with a next step for each part that needs one. Both need `operations:general`.

Account events, such as `credits.low`, `payment.failed` and `member.joined`, reach every endpoint that subscribes to them, and always reach the events feed. `events({ cursor, wait })` reads one page and can wait up to 25 seconds for the next event. `followEvents()` keeps reading until its `signal` aborts. See https://docs.abusezero.com/docs/api-reference/events.

## Browser

Your server and browser imports come with the same installation. The browser import loads a versioned module from `https://abusezero.com`. If your site uses a Content Security Policy, copy the directives from **Developers → Browser SDK → Script → View install code**.

In your frontend, import the browser functions and pass your PUBLISHABLE KEY.

```ts
import { init, observe } from "abusezero/browser";

init({ key: "pk_…" }); // once when your app starts

const { deviceToken } = await observe({ key: "pk_…", claimId });
// Send deviceToken to your server, then pass it as identifiers.device_token in the evaluation.
```

- **Always send `deviceToken`.** It carries the browser data, or the reason there is none, such as `unavailable:consent_declined`. Evaluations still run without browser data.
- **Consent:** collection runs unless you pass `consent`. When your `consent` callback resolves to `false`, the SDK sends no browser data for that claim. If your consent tool doesn't load the script at all, send `unavailable:not_loaded` as the device token.
- **Your sites:** AbuseZero accepts browser data only from HTTPS sites in your site list, in Developers → Browser SDK.
- **Install check:** `init` reports once per page load that the script loaded there, with only the site's address and the script version. Developers → Browser SDK shows where it was seen.
- **When to call `observe`:** call it when the person submits the claim, then send its `deviceToken` with the evaluation.

For script-based integrations, load the standalone browser build with your PUBLISHABLE KEY in its address. It reports in by itself:

```html
<script type="module" src="https://abusezero.com/sdk/abusezero-browser-0.14.0.js?key=pk_…"></script>
```

## Command line

Run any command once with `npx abusezero <command>`, or install it with `npm install -g abusezero`.

```sh
abusezero login                  # sign in with your browser
abusezero whoami                 # who the sign-in acts for
abusezero workspaces list
abusezero workspaces use 74999074913993548694
abusezero benefits list --output table
```

- **Signing in:** `abusezero login` opens your browser. On a machine without a browser, use `abusezero login --device` and enter the code on another device. For scripts, CI and cloud agents, set `ABUSEZERO_CLIENT_ID` and `ABUSEZERO_CLIENT_SECRET` to a machine client from Developers → OAuth apps in the dashboard.
- **Commands:** every action available through MCP has a command. Run `abusezero --help`, then `abusezero <command> --help` for its options. Public information commands, such as `abusezero pricing get` and `abusezero docs get quickstart`, need no sign-in.
- **Input:** pass fields as options, such as `--expires-in-days 30`, or a JSON object with `--input file.json` or `--input -`.
- **Output:** JSON by default. Add `--output table` for a readable table.
- **Changes:** each change prints its idempotency key. Retry with `--idempotency-key <key>` to repeat it safely. Permanent actions ask you to confirm; add `--yes` in scripts.
- **Exit codes:** 0 success, 1 failure, 2 invalid input, 3 sign-in needed, 4 permission denied, 5 not found, 6 conflict, 7 temporarily unavailable.
- **Sign-in storage:** sign-ins are stored only on your computer, in a file only your account can read. A sign-in renews each time it's used and ends after one year unused. `abusezero logout` revokes the sign-in and deletes it.
- **Environment variables:**
  - `ABUSEZERO_CLIENT_ID` and `ABUSEZERO_CLIENT_SECRET` select a machine client.
  - `ABUSEZERO_CONFIG_DIR` changes where sign-ins are stored.
  - `ABUSEZERO_AGENT` names your agent and its run, such as `name=Release bot; run=run_42`, in the workspace's audit trail and request logs.

## MCP

AI apps that support remote MCP connect directly to `https://mcp.abusezero.com/mcp` and sign in through the browser.

For apps that run local MCP servers, use `abusezero mcp`. It uses `ABUSEZERO_API_KEY` when set, then a machine client from `ABUSEZERO_CLIENT_ID` and `ABUSEZERO_CLIENT_SECRET`, and otherwise your command-line sign-in. With none of them, it offers the public tools, which need no sign-in. Apps that haven't signed in can also connect to `https://mcp.abusezero.com/mcp/public` for the public tools.

## Upgrade to 0.14.0

`getReferralLink()` reads your workspace's referral link, and `listReferrals()` lists who signed up with it. `getReferralLink()` calls `GET /v1/billing/referral-link`, and `listReferrals()` calls `GET /v1/billing/referrals`. Both need the `operations:general` scope. The CLI adds `abusezero billing referral-link` and `abusezero billing referrals`. Nothing else changes, and pages that load the standalone script at its `0.13.0` address keep working.

## Upgrade to 0.13.0

IDs are now 20-digit strings. Copy new IDs, replace API keys, and sign in or reconnect your apps. Old IDs and credentials no longer work. The API stays at `v1`.

`dryRunEvaluation()` calls `POST /v1/evaluations/dry-run` and needs the `operations:general` scope. `dryRunDataDeletion()` calls `POST /v1/data-deletions/dry-run`.

Allow and block lists list each value once:
- Send `benefit_ids`, a list of benefit IDs, in place of `benefit_id`. An empty list means every benefit.
- `email_exact` is removed. Use `email`.
- `updateAccessListEntry()` changes an entry's list, benefits, reason or expiry.
- Entries return `value` and `benefits`, and adding or updating one returns `warnings` when a block entry keeps it from taking effect.

Each benefit has one value:
- Send `config.value`, `{ amount, currency }`. It replaces the benefit's earlier value fields, which are removed. `currency` is one of the supported codes, such as `USD`; others return `CURRENCY_NOT_SUPPORTED`.
- `benefitValue({ days, currency, benefit })` reads the **Delivered** and **Saved** totals, in US dollars unless you choose another supported currency.

`denialReasons({ days, benefit })` reads why claims were denied: the denied evaluations grouped by their `reason.code`, largest first.

## License

Proprietary. See `LICENSE`. Third-party components are listed in `THIRD-PARTY-NOTICES`.
