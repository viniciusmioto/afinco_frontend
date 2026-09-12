# Afinco Frontend

Responsive transaction management and statement-import UI built with Next.js 15
App Router, React 19, TypeScript, Tailwind CSS, and Lucide icons.

## Project status

An authenticated login flow and two finance screens are built and tested:
`/transactions` (ledger with local search and filters, manual entry) and
`/upload` (PDF statement import with duplicate resolution and batch save).
94 tests pass across 13 suites.

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
session with the backend before rendering finance data. The middleware check is
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

1. **Account creation — blocking.** Neither screen can create an account, and
   the backend has no endpoint for it. On a fresh database `/upload` correctly
   explains that reviewed rows cannot be saved, and the manual-entry modal
   disables submission — but the user has no way out except editing SQLite by
   hand.
2. **Overview dashboard.** The `Overview` sidebar entry is a placeholder with no
   route. No charts exist anywhere yet and **Recharts is not installed**, so the
   whole analytics surface described in the project goal is outstanding: a
   dual-axis bar/line monthly trend (bars = expenses, line = net flow),
   colourblind-safe categorical distribution bars, and pie charts reserved
   strictly for binary splits such as credit vs. debit. It also needs backend
   aggregation endpoints that do not exist yet.
3. **Duplicate resolution for already-saved rows.** Duplicates are only
   resolvable during import. A transaction saved as `DUPLICATE_PENDING` is
   invisible in the ledger — the status is in `lib/types/transaction.ts` but no
   component renders it — and the backend's
   `POST /api/v1/transactions/resolve-duplicate` and
   `DELETE /api/v1/transactions/{id}` endpoints have no UI at all.
4. **Accounts and Settings screens.** Both are sidebar placeholders without
   routes.
5. **Transaction editing and deletion.** No UI, and the backend has no update
   endpoint either.
6. **Server-side filtering and pagination.** `/transactions` fetches the latest
   100 records and filters them in the browser, so anything older is invisible
   and the backend's `startDate`/`endDate`/`accountId`/`categoryId`/`type`/
   `status`/`page`/`size` query parameters go unused.
7. **Category management.** No UI for creating or renaming categories, pending
   backend endpoints.

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

Jest covers the statement import with mocked API responses: upload payload and
multipart construction, automatic category selection, payment net totals,
duplicate toggle state, category overrides, batch payload generation, and the
error paths for a rejected file, a failed parse, and a failed save. Pure review
logic lives in `lib/statements/` so payload generation is unit-tested apart
from the React tree.

## Screens

### `/transactions`

Loads up to the latest 100 backend records and applies search, category, and
date filters locally. Account and category choices come from the backend's
reference endpoints, so the manual-entry modal works before the first
transaction as soon as an account exists. Payment categories reduce the
`Visible net` summary while all stored row amounts remain positive.

### `/upload`

Imports a PDF statement in two steps.

**1. Attach and parse.** A mobile-first drop container accepts a dragged PDF or
a tap that opens the native file picker. Files are checked locally before any
request: PDF only, non-empty, and within the backend's 10 MiB cap. The statement
type (`CREDIT_CARD` or `CHECKING_ACCOUNT`) is chosen before parsing and posted
with the file to `POST /api/v1/statements/upload` as multipart form data; the
`Content-Type` header is deliberately left unset so the browser generates the
multipart boundary Spring needs.

**2. Review and save.** Parsed rows render as a table on desktop and as a
touch-friendly card stack on smaller viewports. Rows the upload flagged as
possible duplicates carry amber accents, a "Possible duplicate" badge, and
inline **Import anyway** / **Skip** actions; banner-level actions import or skip
every flagged row at once. Flagged rows start skipped so an accidental save can
never double-count spending, and clean rows start included with an import
checkbox. Every row exposes a category dropdown pre-selected from the backend's
categorization suggestion. An unknown suggestion safely falls back to
`Occasional`.

**Save** sends the finalized rows to `POST /api/v1/transactions/batch`. Skipped
rows are dropped from the payload entirely, and a kept duplicate is sent with
`forceDuplicate: true` so the API confirms it rather than re-flagging it. Saving
is blocked until a destination account is selected and at least one row is kept.
Payment rows retain their positive amount in the batch payload but reduce the
displayed import total.

Account and category options come from `GET /api/v1/accounts` and
`GET /api/v1/categories`. Accounts have no backend seed or create endpoint yet,
so on a fresh database the review screen explains that reviewed rows cannot be
saved until an account row exists rather than failing at submit time.

Row identity uses the parsed row's position, not its signature: repeated rows in
one statement share a signature, so keying on it alone would collapse them.

## Layout

`AppShell` renders the sidebar on desktop and a scrollable section-tab row on
mobile. Routes pass a `current` label to mark the active entry, which keeps the
shell a server component. Overview and Accounts are placeholders without routes.
