# Afinco Frontend

Responsive transaction management and statement-import UI built with Next.js 15
App Router, React 19, TypeScript, Tailwind CSS, and Lucide icons.

## Project status

An authenticated login flow and two finance screens are built and tested:
`/transactions` (one statement or one month at a time, with search, category
filter, and manual entry) and `/upload` (multi-file PDF statement import with
parallel parsing, cross-file duplicate detection, first-account creation, and
per-statement saving), plus an account menu with a confirmed "delete all
transaction data" reset. 150 tests pass across 21 suites; lint, type checking,
and the production build report no warnings.

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

1. **Overview dashboard.** The `Overview` sidebar entry is a placeholder with no
   route. No charts exist anywhere yet and **Recharts is not installed**, so the
   whole analytics surface described in the project goal is outstanding: a
   dual-axis bar/line monthly trend (bars = expenses, line = net flow),
   colourblind-safe categorical distribution bars, and pie charts reserved
   strictly for binary splits such as credit vs. debit. It also needs backend
   aggregation endpoints that do not exist yet.
2. **Duplicate resolution for already-saved rows.** Duplicates are only
   resolvable during import. A transaction saved as `DUPLICATE_PENDING` is
   invisible in the ledger — the status is in `lib/types/transaction.ts` but no
   component renders it — and the backend's
   `POST /api/v1/transactions/resolve-duplicate` and
   `DELETE /api/v1/transactions/{id}` endpoints have no UI at all.
3. **Accounts screen.** The first account can be created inline on `/upload`,
   but the `Accounts` sidebar entry is still a placeholder: there is no screen
   to add a second account outside an import, rename, or delete accounts
   (the backend has no update/delete endpoint either).
4. **Transaction editing and deletion.** No UI, and the backend has no update
   endpoint either.
5. **Paging inside one scope.** `/transactions` loads a whole statement or month
   (up to 500 rows) and applies search and category filters in the browser. A
   month with more than 500 rows shows the newest 500 with a notice.
6. **Category management.** No UI for creating or renaming categories, pending
   backend endpoints.
7. **Checking-account import.** The statement-type toggle offers it, but the
   backend parser does not exist yet, so those uploads fail with `422`.
8. **Undoing an import.** A saved statement cannot be deleted from the UI (the
   backend has no statement delete endpoint yet).
9. **Legacy rows.** Transactions saved before statements existed have no
   statement, so they appear only in the month view.

## Run locally

Start the backend on port `8080`, then install dependencies and run the frontend:

```shell
npm ci
npm run dev
```

Open `http://localhost:3000/login`, then continue to `/transactions` for the ledger or
`http://localhost:3000/upload` to import a statement. Browser client calls are sent to the
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
first-account creation. The ledger tests cover statement/month resolution from
the URL, view switching, stepping, and empty states using an in-memory
`next/navigation` stand-in (`test/next-navigation.ts`). Pure review
logic lives in `lib/statements/` so payload generation is unit-tested apart
from the React tree.

## Screens

### `/transactions`

The ledger never shows every transaction at once. It shows exactly one scope,
kept in the URL so refreshes and shared links reopen it:

- **By statement** (default): `/transactions?view=statement&statement=7`. The
  selector lists imported statements newest period first with their account and
  row count; the arrow buttons step to the older or newer statement. With no
  `statement` parameter, or an unknown id, the newest statement opens.
- **By month**: `/transactions?view=month&month=2026-07` shows transactions
  dated in that calendar month from any statement, plus manual entries. A
  **Statement** column names each row's source statement or "Manual entry".

Switching views keeps your place: a statement opens the month its period ends
in, and a month opens the statement that ends in it. When no statements exist
but manual entries do, the page opens by month. Summary cards, search, and the
category filter apply to the selected scope. A manual entry is shown in its
month right after it is saved. Months come from `GET /api/v1/transactions/months`
and statements from `GET /api/v1/statements`. Payment categories reduce the
`Visible net` summary while stored amounts remain positive.

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

`AppShell` renders the sidebar on desktop and a scrollable section-tab row on
mobile. Routes pass a `current` label to mark the active entry, which keeps the
shell a server component. The desktop sidebar is sticky, so the account menu
stays visible on long ledgers. Overview and Accounts are placeholders without
routes.

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
