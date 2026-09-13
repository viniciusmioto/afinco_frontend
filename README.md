# Afinco Frontend

Responsive transaction management and statement-import UI built with Next.js 15
App Router, React 19, TypeScript, Tailwind CSS, and Lucide icons.

## Project status

An authenticated login flow and four finance screens are built and tested:
`/overview` (spending dashboard: KPIs, spending by type over time, and a
category comparison, by month or by statement), `/breakdown` (one statement or
month in detail: type distribution, daily or weekly category charts per type,
and the largest expenses), `/transactions` (one statement
or one month at a time, filtered by bank, with credit and debit in separate
tables, search, category filter, and manual entry), and `/upload` (multi-file
PDF statement import with parallel parsing, cross-file duplicate detection,
first-account creation, and per-statement saving), plus an account menu with a
confirmed "delete all transaction data" reset. 223 tests pass across 32 suites;
lint, type checking, and the production build report no warnings.

Requires the [afinco_backend](https://github.com/viniciusmioto/afinco_backend)
API. The backend owns authentication and finance data; this application keeps
the session in an HTTP-only same-origin cookie through its API proxy.

## Sign in

Open `http://localhost:3000/login` and use the temporary local account:

```text
Email: test@test.com
Password: 123@Test
```

Protected routes perform a quick cookie-presence redirect and then verify the
session with the backend's public `GET /api/v1/auth/session` probe before
rendering finance data. Because the probe always answers `200`, a stale cookie
(for example after a backend restart) redirects to login without a console
error. The middleware check is
only a UX optimization; backend authorization remains the security boundary.
Unsafe API calls obtain a CSRF cookie and echo its token in `X-XSRF-TOKEN`.
Logout invalidates the backend session.

The proxy deliberately forwards only the required content, cookie, and CSRF
headers and relays all backend `Set-Cookie` headers. Auth responses are never
cached. Browser responses include CSP, frame denial, MIME-sniffing protection,
a no-referrer policy, and a restricted permissions policy.

The test credential is documented and must be replaced before exposing Afinco
outside a trusted LAN. When HTTPS is terminated by a homelab reverse proxy, set
`AFINCO_SECURE_COOKIES=true` on the backend. The backend's
`docs/authentication.md` contains the complete security and deployment model.

### Not implemented yet

Ordered roughly by how much each one blocks real use.

1. **Duplicate resolution for already-saved rows.** Duplicates are only
   resolvable during import. A transaction saved as `DUPLICATE_PENDING` is
   invisible in the ledger — the status is in `lib/types/transaction.ts` but no
   component renders it — and the backend's
   `POST /api/v1/transactions/resolve-duplicate` and
   `DELETE /api/v1/transactions/{id}` endpoints have no UI at all.
2. **Accounts screen.** The first account can be created inline on `/upload`,
   but the `Accounts` sidebar entry is still a placeholder: there is no screen
   to add a second account outside an import, rename, or delete accounts
   (the backend has no update/delete endpoint either).
3. **Transaction editing and deletion.** No UI, and the backend has no update
   endpoint either.
4. **Paging inside one scope.** `/transactions` loads a whole statement or month
   (up to 500 rows) and applies search and category filters in the browser. A
   month with more than 500 rows shows the newest 500 with a notice.
5. **Category management.** No UI for creating or renaming categories, pending
   backend endpoints.
6. **Checking-account import.** The statement-type toggle offers it, but the
   backend parser does not exist yet, so those uploads fail with `422`.
7. **Undoing an import.** A saved statement cannot be deleted from the UI (the
   backend has no statement delete endpoint yet).
8. **Legacy rows.** Transactions saved before statements existed have no
   statement, so they appear only in the month view.

## Run locally

Start the backend on port `8080`, then install dependencies and run the frontend:

```shell
npm ci
npm run dev
```

Open `http://localhost:3000/login`; after signing in you land on `/overview`. Continue to
`/transactions` for the ledger or `http://localhost:3000/upload` to import a statement. Browser client calls are sent to the
same-origin `/api/v1` route. The Next.js server proxies them to
`API_PROXY_TARGET`, which defaults to `http://localhost:8080/api/v1`. This avoids
requiring permissive CORS configuration on the Spring API.

## Run as a separate Docker container

Start the backend from `../afinco_backend`, then start this frontend independently:

```shell
docker compose up --build -d
```

The image build sets `NEXT_OUTPUT=standalone`, which switches `next.config.mjs`
to the standalone server the runtime stage copies. Local `npm run build` and
`npm start` use the regular output, so `next start` runs without warnings.

The frontend container uses `http://host.docker.internal:8080/api/v1` to reach
the separately managed backend container through the published backend port.
The image build runs the unit tests and the production Next.js build before
creating a non-root, read-only runtime image.

## Quality checks

```shell
npm test
npm run lint
npm run build
```

Jest covers the statement import with mocked API responses: parallel parsing
limits, per-file failures and retries, cross-file duplicates, identical periods,
category overrides, statement payload generation, sequential "save all", and
first-account creation. The ledger tests cover statement/month and bank
resolution from the URL, view switching, stepping, the credit/debit split, and
empty states; the overview tests cover grouping, bank and range filters, period
selection, keyboard chart navigation, and table views. Both use an in-memory
`next/navigation` stand-in (`test/next-navigation.ts`). Pure review
logic lives in `lib/statements/` so payload generation is unit-tested apart
from the React tree.

## Screens

### `/overview`

The landing page after sign-in (`/` redirects here). One filter row scopes
everything below it and is kept in the URL, for example
`/overview?group=month&bank=TD+Bank&range=12&period=2026-07`:

- **Group by** months (default) or statements. Months can combine every bank
  (**All banks**) or show one; statements always belong to one bank, so that
  grouping picks the newest statement's bank and offers no "All banks" option.
  A note under the filters says which case applies.
- **Bank** and **Show last** 3, 6, or 12 periods, or all of them.

Data comes from `GET /api/v1/analytics/spending`, which returns confirmed
spending per category per period. Card payments are transfers, not spending,
and are left out everywhere on the page. Periods the imported data only partly
covers (a month still in progress or outside the statements, a short first
statement) are flagged **partial**: they are drawn with hollow points and left
out of averages and comparisons, so a half-imported month never reads as a
drop in spending.

- **Key figures:** total spent in the range, average per complete period, the
  last complete period (or the selected one) against the average of the other
  complete periods, and the fixed / variable / occasional mix.
- **Spending by type:** one line per expense type on a single axis, with a
  crosshair tooltip on hover, arrow-key navigation, series toggles that double
  as a value readout, and a table view. Clicking (or pressing Enter on) a period
  selects it.
- **Spending by category:** horizontal bars, largest first, colored by expense
  type. With a period selected they show that period with a tick at each
  category's average per complete period and the difference in percent. A
  table view lists totals, averages, and shares.

Charts are hand-built SVG and HTML (`components/overview/`) rather than a chart
library, which keeps the page at about 10 kB and lets the marks follow the
palette and accessibility rules exactly. The three type colors are a
colorblind-safe categorical set shared with the ledger's **Type** column
(`lib/expense-types.ts`); all figures are derived by pure, unit-tested functions
in `lib/overview/`.

### `/breakdown`

**Period breakdown** analyzes exactly one statement or one month, chosen with
the same selector, bank rules, and URL parameters as `/transactions`
(`/breakdown?view=month&month=2026-07`). **View transactions** opens the same
period in the ledger, and the ledger's **Break down this period** comes back.
Only confirmed rows count, and card payments and credits are left out.

- **Summary:** a stacked bar of how spending splits between fixed, variable,
  and occasional, then Total expense | Fixed | Variable | Occasional with their
  share, spending per day, and the change against the average of the other
  complete periods of the same kind and bank (from
  `GET /api/v1/analytics/spending`). A partly imported period is not compared.
- **Spending over time:** three stacked bar charts, one per type, stacked on the
  same time axis (identical width and left margin), each bar split by category.
  **Days** or **Weeks** (7-day runs from the period's first day). Hovering or
  arrow keys highlight the same day in all three charts and show the categories
  in a tooltip; each chart has its own amount scale and a table view.
- **Largest expenses:** the three biggest expenses of each type with date,
  description, category, amount, and share of the type.

Category colors come from palette slots 4–8 in category-id order within each
type, so they never repeat the type colors and a category keeps its color in
every period (`lib/breakdown/breakdown.ts`, where all calculations are
unit-tested). The parser stores refunds as positive amounts, so a merchant
refund is not yet distinguishable from a purchase; only payment-type rows are
excluded.

### `/transactions`

The ledger never shows every transaction at once. It shows exactly one scope,
kept in the URL so refreshes and shared links reopen it:

- **By statement** (default): `/transactions?view=statement&statement=7`. A
  statement belongs to one bank, so the **Bank** selector lists only banks with
  statements and the statement selector lists that bank's statements by period
  alone ("Jul 14 – Aug 13, 2026"), newest first; the arrow buttons step to the
  older or newer statement. With no `statement` parameter, or an unknown id, the
  newest statement opens.
- **By month**: `/transactions?view=month&month=2026-07` shows transactions
  dated in that calendar month from every bank (**All banks**, with a **Bank**
  column), or from one bank with `&bank=TD+Bank`. A **Statement** column names
  each row's source statement or "Manual entry".

A note under the selectors states whether one bank or all banks are shown.
Credit (credit card) and debit (debit card and checking account) transactions
are listed in two separate tables, each with its amount spent and count; a
statement shows only the table of its own account type. The **Type** column
shows the expense type (Fixed, Variable, Occasional, Payment), and payments
read as negative amounts.

Switching views keeps your place: a statement opens the month its period ends
in, and a month opens the statement that ends in it. When no statements exist
but manual entries do, the page opens by month. Summary cards, search, and the
category filter apply to the selected scope. The summary shows **Total spent**
(payments excluded), and the number of **Credit** and **Debit** transactions
with what each spent. A manual entry is shown in its month right after it is
saved. Months come from `GET /api/v1/transactions/months?bankName=…` and
statements from `GET /api/v1/statements`.

### `/upload`

**1. Add statements.** Drop or pick one or more PDFs. Each file is validated
locally (PDF only, non-empty, within 10 MiB) and parsing starts immediately; no
extra click is needed. Files parse in parallel, at most two at a time
(`MAX_PARALLEL_PARSES`), so a batch is fast without flooding the backend. The
queue shows each file's status (queued, parsing, ready, failed, saving, saved),
its billing period, row and duplicate counts, and import total. A failed parse
stays isolated and can be retried; locally rejected files explain why and can
be removed. Picking the same file twice is ignored.

**2. Review.** Parsed statements are listed chronologically, and the review
follows the oldest one until you choose another. Rows the backend flagged
(already saved, or repeated inside the statement) and rows that also appear in
another queued file ("Also in july.pdf") are amber and start skipped. A file
covering exactly the same period as another queued file is called out. Each row
keeps its suggested category, which can be overridden, and banner actions import
or skip every flagged row. When no account exists, the save bar offers an inline
**Create account** form that becomes the default for every queued statement.

**3. Save.** **Save N transactions** stores the selected statement with
`POST /api/v1/statements`; **Save all ready** saves every reviewable statement
one after another, oldest first. Skipped rows are never sent, and a kept
duplicate carries `forceDuplicate: true`. Re-importing a period that is already
saved adds the rows to that existing statement. Each saved statement links to
its ledger view.

Queue state lives in a pure reducer (`lib/statements/import-queue.ts`) and the
scheduling, parsing, and saving in `useStatementImport`, so the behaviour is
unit-tested without rendering.

Row identity uses the parsed row's position, not its signature: repeated rows in
one statement share a signature, so keying on it alone would collapse them.

## Layout

`AppShell` renders a sticky sidebar on desktop (`lg` and up). Below `lg`, a
header stays pinned while scrolling; its menu button opens the navigation as a
drawer (focus moves into it, Escape or a backdrop tap closes it, and page
scrolling is locked while it is open). Routes pass a `current` label to mark
the active entry, which keeps the shell a server component. Accounts is still a
placeholder without a route.

### Account menu and data reset

The signed-in email in the sidebar (or the person icon in the mobile header)
opens an accessible account menu (arrow keys, Escape, outside click) with
**Delete all transaction data** and **Sign out**.

**Delete all transaction data** never deletes directly. It opens a confirmation
dialog asking "Are you sure you want to delete all transaction data?" and states
exactly what will be removed, using `GET /api/v1/transaction-data` (for example
"251 transactions and 7 imported statements"), and that accounts, categories,
and the login are kept. **Cancel** is the large, dark, initially focused button,
and Escape also cancels. **Delete data** is a small outlined secondary button,
disabled when there is nothing to delete. Focus stays inside the dialog, which
renders at the page root so the blurred mobile header cannot clip it.

After `DELETE /api/v1/transaction-data` succeeds, the dialog reports the counts
and offers **Import statements** (the focused action) or **Close**, which
reloads the current page without its old statement or month parameters.
