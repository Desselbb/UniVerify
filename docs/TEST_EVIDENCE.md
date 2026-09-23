# UniVerify — Test, Performance and Security Evidence

All figures in this document were produced by executing the commands shown, on the date shown, against a
running stack. Raw command output is committed under `docs/evidence/`. Anything that was **not** measured is
listed in *Limitations* rather than asserted.

- Date of run: 2026-09-23 (UTC)
- Branch: `devin/1790136728-test-evidence`
- Commit base: `master` (includes PR #1 security hardening and PR #2 sidebar navigation)

## 1. Test environment

| Item | Value |
| --- | --- |
| Host OS / kernel | Linux 5.15.200 (x86_64) |
| CPU / RAM | 2 vCPU / 7 GiB |
| Node.js (backend, frontend, benchmark) | v20.18.1 |
| Node.js (Hardhat 3 toolchain) | v22 (`nvm use 22`) |
| Database | PostgreSQL 15 in Docker, `localhost:5432`, database `univerify_test` |
| Blockchain node | Anvil (chainId 31337), JSON-RPC `http://localhost:8547` |
| Contract under test | `CredentialRegistry` deployed at `0x09635F643e140090A9A8Dcd712eD6285858ceBef` |
| Backend env | `backend/.env.test` (template committed as `backend/.env.test.example`) |
| Bcrypt work factor during tests/benchmark | 4 (production default is 12) |

Reproduction: copy `backend/.env.test.example` to `backend/.env.test`, start `docker compose up -d postgres redis`
plus an Anvil/Besu node on 8547, create the `univerify_test` database, then run the commands below.

## 2. Integration tests (database + blockchain)

Command:

```
cd backend && npm run test:integration
```

Suite: `backend/tests/integration/api.int.test.js` — **24 tests, 24 passed**, executed against the real
PostgreSQL instance and the real Anvil node (no mocks for DB, chain, hashing or JWT).

Fixtures created per run by `backend/tests/integration/setup.js` (`sequelize.sync({ force: true })`):

- Institution `Integration University`, registration code `INT-001`
- `int-admin@example.edu` (`university_admin`), `int-graduate@example.edu` (`graduate`), password `password123`

What the suite asserts, grouped:

| Area | Assertions |
| --- | --- |
| Health | `GET /api/health` reports `database: up`, `blockchain: up` |
| Authentication | invalid password rejected; malformed email rejected by validator |
| Registration | a request asking for `university_admin` yields a `graduate` account (PR #1 regression) |
| RBAC | unauthenticated admin call rejected; forged JWT rejected; graduate blocked from admin routes; admin blocked from graduate routes |
| Issuance | credential persisted in Postgres, anchored on chain with a tx hash; duplicate hash rejected; missing fields rejected; admin listing returns the credential |
| Verification | valid hash returns `valid` with matching on-chain record; unknown hash returns `not_found`; malformed hash rejected; registered file verifies; one-byte-tampered file does not |
| Reporting | PDF verification report generated |
| Graduate | graduate sees own credential |
| Revocation | revocation written to DB and chain; subsequent public verification returns `revoked`; graduates cannot revoke |
| Audit | verification, issuance and revocation write audit-log rows |

Raw output: `docs/evidence/backend-tests-coverage.txt` (combined run, see §6).

## 3. API tests (HTTP level)

The integration suite above *is* the API test suite: every case drives the Express app over HTTP with
Supertest (`request(app).get/post(...)`), asserting status codes and response bodies — no controller is called
directly. Endpoints exercised: `GET /api/health`, `POST /api/auth/login`, `POST /api/auth/register`,
`POST /api/admin/credentials`, `GET /api/admin/credentials`, `POST /api/admin/users`,
`POST /api/admin/credentials/:hash/revoke`, `GET /api/admin/audit-logs`, `GET /api/verify/:hash`,
`POST /api/verify/file`, `GET /api/verify/:hash/certificate`, `GET /api/graduate/credentials`.

## 4. Security tests and scans

### 4.1 Adversarial integration suite

Command:

```
cd backend && npm run test:integration
```

Suite: `backend/tests/integration/security.int.test.js` — **17 tests, 17 passed**.

| Group | Cases |
| --- | --- |
| Injection resistance | SQL metacharacters in the verification path; SQL-injection payload at login; `<script>` payload stored and returned as JSON data (no HTML interpolation) |
| Token handling | role claim edited with original signature rejected; `alg=none` token rejected; token signed with the wrong secret rejected; expired token rejected |
| Tenant isolation | admin cannot revoke another institution's credential; a foreign `institutionId` in staff creation is ignored and the user is scoped to the caller's institution; a university admin cannot create a `system_admin` |
| Data exposure | password hash absent from login response and from the admin user list; password reset response does not disclose whether an account exists |
| Upload hardening | non-whitelisted file type rejected; oversized upload rejected |
| Transport | Helmet security headers present |
| Brute force | repeated failed logins eventually return HTTP 429 |

### 4.2 Dependency scan — `npm audit`

Command: `npm audit` in `backend/`, `frontend/`, `blockchain/`. Raw output: `docs/evidence/npm-audit.txt`.

| Workspace | Result |
| --- | --- |
| backend | `5 vulnerabilities (3 moderate, 2 high)` — `multer <=2.2.0` (high, DoS ×4; fix available), `qs 2.2.5–6.15.3` (moderate; fix available), `uuid <11.1.1` via `sequelize` (moderate; fix is a breaking downgrade), `xlsx *` (high, prototype pollution + ReDoS; **no fix available**) |
| frontend | `31 vulnerabilities (9 low, 8 moderate, 14 high)` — all reached through `react-scripts` build tooling (dev-time dependency chain) |
| blockchain | `15 vulnerabilities (12 low, 1 moderate, 2 high)` |

No package was upgraded, downgraded or pinned to make this scan look better; the numbers above are the
current state of the lockfiles.

### 4.3 Static analysis — Semgrep

Command:

```
semgrep scan --config p/javascript --config p/nodejs --config p/secrets \
  --exclude node_modules --exclude build backend frontend/src blockchain/contracts
```

Result: 110 rules over 123 files, **1 finding**, raw output in `docs/evidence/semgrep.txt`:

> `backend/src/config/database.js:12` — `bypass-tls-verification`:
> `? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }`

This is the managed-Postgres (Render) SSL path; the CA chain is not verified. No secret-detection findings.
Semgrep has no Solidity ruleset in the community registry (`p/solidity` returns HTTP 404), so the contract was
covered by the Solidity test suite rather than by a static scanner.

### 4.4 Lint

`cd backend && npx eslint src scripts tests` — clean (0 problems). `cd frontend && npx tsc --noEmit` and
`npm run build` — clean.

## 5. Smart-contract tests

Commands (Node 22):

```
cd blockchain && npx hardhat test solidity
cd blockchain && npx hardhat test solidity --coverage
```

`blockchain/contracts/CredentialRegistry.t.sol` — **20 tests, 20 passing**, including a fuzz test executed for
**256 generated cases** (`testFuzz_UnauthorizedCallerCanNeverAnchor(address,bytes32)`).

Coverage (`docs/evidence/solidity-coverage.txt`):

| File | Line % | Statement % |
| --- | --- | --- |
| `contracts/CredentialRegistry.sol` | 100.00 | 100.00 |

Access-control behaviour asserted: only authorised issuers can anchor; an unauthorised address can never
anchor (fuzzed); issuance reverts for a foreign institution, a duplicate hash and a zero hash; only the issuer
or institution admin can revoke; double revocation reverts; a de-authorised issuer can no longer anchor;
`authorizeIssuer` reverts for a non-admin; `registerInstitution` is registrar-gated; ownership transfer moves
owner-only rights. Raw output: `docs/evidence/solidity-tests.txt`.

## 6. Coverage metrics

### Backend (Jest, `--coverage`)

| Run | Command | Suites | Tests | Stmts | Branch | Funcs | Lines |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Unit only | `npm run test:coverage` | 4 | 22 | 9.62% | 13.53% | 8.42% | 9.72% |
| Unit + integration | `npx jest --runInBand --coverage` | 6 | 63 | **70.32%** | **56.00%** | **68.42%** | **70.95%** |

Raw output: `docs/evidence/backend-unit-coverage.txt`, `docs/evidence/backend-tests-coverage.txt`.

### Frontend (react-scripts/Jest)

```
cd frontend && CI=true npx react-scripts test --coverage --watchAll=false
```

**5 suites, 20 tests, all passed** — statements **24.26%**, branches **25.84%**, functions **20.30%**,
lines **24.48%**. Covered closely: `VerifyPage.tsx` 96.66%, `LoginPage.tsx` 95.65%, `Layout.tsx`,
`VerificationResultCard.tsx`. Uncovered: `GraduatePage`, `RegisterPage`, `ResetPasswordPage`, admin pages.
Raw output: `docs/evidence/frontend-tests-coverage.txt`.

### Smart contract

100% line and statement coverage (§5).

## 7. Performance benchmark

Command:

```
cd backend && BASE_URL=http://localhost:3010/api BENCH_HASH=<seeded hash> \
  BENCH_EMAIL=admin@example.edu BENCH_PASSWORD=password123 \
  CONCURRENCY=20 DURATION=20 WARMUP=3 node scripts/benchmark.js
```

Harness: `backend/scripts/benchmark.js` (Node `http`, closed-loop, 20 concurrent workers per scenario,
3 s warm-up discarded, ~17 s measured window per scenario). Target: the local backend on port 3010 against
local Postgres and local Anvil, loopback network — i.e. no network latency and no hosted-tier throttling.
Rate limiting was raised via env for the benchmark only; production defaults are unchanged.
Full JSON: `docs/evidence/performance-benchmark.json`.

| Scenario | Requests | req/s | Errors | p50 ms | p90 ms | p95 ms | p99 ms | max ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /health` | 29,206 | 1,718.10 | 0 (0%) | 10.35 | 16.51 | 18.72 | 25.45 | 54.78 |
| `GET /verify/:hash` (valid, hits chain) | 9,664 | 569.71 | 0 (0%) | 33.60 | 43.04 | 47.40 | 56.00 | 89.95 |
| `GET /verify/:hash` (unknown hash) | 10,690 | 629.08 | 0 (0%) | 29.94 | 39.79 | 43.99 | 53.12 | 78.27 |
| `POST /auth/login` | 7,908 | 465.56 | 0 (0%) | 42.20 | 52.74 | 56.62 | 66.36 | 83.18 |

All 57,468 measured requests returned HTTP 200; the error rate over the run was 0%. Note this is a
success-rate measurement for a ~68 s load window, **not** an availability/uptime measurement.

Caveats that must accompany these numbers:

- Login throughput is inflated: the benchmark database hashes passwords with bcrypt work factor **4**, while
  the production default is **12** (roughly 2⁸ times more work per login). Login figures are therefore an
  upper bound and not representative of production.
- Both API and database ran on the same 2-vCPU host, so throughput is host-bound rather than a scaling limit.
- No test was run against the hosted Render deployment; free-tier cold start (~1 min after idle) is not
  captured here.

## 8. User acceptance testing (UAT)

Executed in a real browser against the local stack (CRA dev server on :3001 → API on :3010 → `univerify_test`
→ Anvil). Full write-up, including steps and expected/actual for every case: `docs/evidence/uat-report.md`
(test plan: `TEST_PLAN_UAT.md`). Screenshots and a screen recording were captured for each scenario.

| # | Scenario | Result |
| --- | --- | --- |
| U1 | Anonymous verification of the seeded hash → `Valid`, correct holder data, on-chain record, tx hash | Pass |
| U2a | Unknown well-formed hash → `Not found` | Pass |
| U2b | Malformed input `notahash` → "Invalid credential hash", page stays usable | Pass |
| U3 | Upload of an unregistered PDF → `Not found`, displayed hash matches local `sha256sum` | Pass |
| U4 | Admin sidebar navigation across `/admin/credentials`, `/institutions`, `/users`, `/audit` | Pass |
| U5 | Admin issues a credential → row shows `On chain`/`Valid`; anonymous verification returns `Valid` | Pass |
| U6 | Admin revokes with a reason → anonymous verification returns `Revoked`, reason shown, `Revoked on chain: Yes` | Pass |
| U7 | Graduate sees only graduate sections, views own credential, QR share link works, `/admin/users` redirects | Pass |
| U8 | ~420 px viewport: hamburger opens the drawer, navigation works, drawer auto-closes | Pass |
| — | Browser console: no errors, warnings or unhandled rejections | Pass |

Not executed: the optional variant of U3 (issue a credential from a file hash, then re-upload that exact file
to obtain `Valid`). No defects were found in this pass.

## 9. Limitations — what this evidence does *not* cover

1. **No CI pipeline.** All runs above are local and manual; there is no automated pipeline enforcing them.
2. **No availability/uptime measurement.** The 0% error rate covers a ~68 s benchmark window only.
3. **No hosted-deployment performance data.** The Render instance was not load-tested.
4. **No digital signatures.** Verification proves hash membership and non-revocation, not issuer identity:
   the chain stores unsalted SHA-256 digests written by a single shared backend key.
5. **Known open defect (pre-existing, not fixed here):** if on-chain anchoring reverts, the backend can still
   store the credential off-chain and report it `Valid`.
6. **Known UI defect (pre-existing):** the `not_found` result card still renders an on-chain record block for
   chain-only anchors.
7. **Frontend coverage is low (24%)** — admin, registration, reset-password and graduate pages have no unit
   tests; they are covered only by the UAT pass.
8. **Unimplemented features that are configured but untested because they do not exist:** Redis-backed
   distributed rate limiting (rate limiting is per-process in memory), SMTP/email delivery, MFA backup-code
   consumption, email verification.
9. **`xlsx` has a high-severity advisory with no fix available**; `multer`/`qs` have fixes that were not
   applied in this evidence run to keep the measured artefact identical to the committed lockfile.
10. **Bcrypt work factor 4** in the test environment (production 12) affects login latency figures only.
11. **Ephemeral chain state on the hosted deployment**: contract addresses and transaction hashes change on
    restart; credential hashes do not.

## 10. Index of raw evidence files

| File | Contents |
| --- | --- |
| `docs/evidence/backend-tests-coverage.txt` | Jest run of all 6 backend suites (63 tests) with coverage table |
| `docs/evidence/backend-unit-coverage.txt` | Jest unit-only run (22 tests) with coverage table |
| `docs/evidence/frontend-tests-coverage.txt` | react-scripts test run (20 tests) with coverage table |
| `docs/evidence/solidity-tests.txt` | `hardhat test solidity` output, 20 passing + fuzz runs |
| `docs/evidence/solidity-coverage.txt` | Solidity coverage report (100% lines/statements) |
| `docs/evidence/performance-benchmark.json` | Full benchmark JSON: parameters, latency percentiles, status counts |
| `docs/evidence/npm-audit.txt` | `npm audit` for backend, frontend, blockchain |
| `docs/evidence/semgrep.txt` | Semgrep scan output (1 finding) |
| `docs/evidence/uat-report.md` | Browser UAT report, scenario by scenario |
| `TEST_PLAN_UAT.md` | UAT test plan used for the browser run |
