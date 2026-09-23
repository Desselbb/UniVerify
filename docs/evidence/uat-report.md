# UniVerify — User Acceptance Test (UAT) report

| Field | Value |
| --- | --- |
| Branch | `devin/1790136728-test-evidence` (HEAD `5c9a546`, merged security hardening + sidebar nav) |
| Frontend | CRA dev server, http://localhost:3001 (`REACT_APP_API_URL=http://localhost:3010/api`) |
| Backend | Express API, http://localhost:3010, DB `univerify_test`, env `backend/.env.test` |
| Chain | anvil JSON-RPC http://localhost:8547, `CredentialRegistry` at `0x09635F643e140090A9A8Dcd712eD6285858ceBef` |
| Accounts | `admin@example.edu` (university_admin), `graduate@example.edu` (graduate) — password `password123` |
| Seeded credential | `0x929f06d4e937e5b0f796b5735d6e37450b0fbdeb4c59363bd9095af463ca230f` (Jane Graduate, BSc Computer Science) |
| Browser | Chrome (Incognito), desktop 1024px and mobile ~400px viewport |
| Recording | `/home/ubuntu/screencasts/univerify-uat/univerify-uat-edited.mp4` |
| Result | 8 / 8 scenarios passed, 0 defects observed |

Test plan: `/home/ubuntu/univerify/TEST_PLAN_UAT.md`

---

## U1 — Anonymous public verification of a valid hash

**Steps:** signed out on `/`, pasted the seeded hash, clicked **Verify**.

**Expected:** green `Valid` chip, credential details, transaction hash and an On-chain record block.

**Actual:** URL became `/verify/0x929f06d4…`; card showed green **Valid**, Student `Jane Graduate`,
Degree `BSc Computer Science`, Institution `Example University`, Transaction
`0xd50b5491fc695e27e6d80cf5e150892517c9219763f2981843db8e9babd4e293`, On-chain record with issuer
`0xf39Fd6e5…92266`, Institution id `3`, `Revoked on chain: No`.

**Result: PASS** — evidence: `/home/ubuntu/screenshots/ss_03e28c3d.png`
(pre-state `/home/ubuntu/screenshots/ss_b64526d8.png`).

## U2 — Unknown and malformed hashes

**Steps:** (a) submitted a well-formed unknown hash (`0x` + 64 × `a`); (b) submitted `notahash`.

**Expected:** (a) `Not found`; (b) a validation error, no crash.

**Actual:** (a) red **Not found** chip with "No credential matches this hash.", no credential fields.
(b) error alert reading exactly **"Invalid credential hash"**; the page stayed interactive and the
form remained usable (no white screen or React error overlay).

**Result: PASS** — evidence: `/home/ubuntu/screenshots/ss_b6375473.png`,
`/home/ubuntu/screenshots/ss_3d4e9286.png`.

## U3 — File-upload verification of an unregistered document

**Steps:** clicked the dropzone and selected `/home/ubuntu/uat/unregistered-diploma.pdf`
(sha256 `794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b`).

**Expected:** one result card, `Not found`, hash equal to the file's SHA-256.

**Actual:** single card with a red **Not found** chip and hash
`0x794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b` — matches `sha256sum`.

**Result: PASS** — evidence: `/home/ubuntu/screenshots/ss_5e95d336.png`
(file picker: `/home/ubuntu/screenshots/ss_789cc250.png`).
*Not executed (optional in the brief): registering a file hash by admin issuance and re-uploading
the same file to show `Valid`.*

## U4 — Admin login and sidebar navigation

**Steps:** signed in as `admin@example.edu`, clicked each Administration item in the left drawer.

**Expected:** correct heading, panel and highlighted sidebar item per section.

**Actual:** `/admin/credentials` → heading `Credentials` with the "Issue a credential" form and the
credentials table; `/admin/institutions` → heading `Institutions` listing `Example University`;
`/admin/users` → heading `Users` with rows for `admin@example.edu` and `graduate@example.edu` plus
the "Create staff account" form; `/admin/audit` → heading `Audit log` with populated rows. The
clicked item was highlighted in each case.

**Result: PASS** — evidence: `/home/ubuntu/screenshots/ss_b4dcf56a.png` (sidebar),
`ss_8139eef6.png` (Credentials), `ss_177b1319.png` (Institutions), `ss_d87720a6.png` (Users),
`ss_f378af14.png` (Audit log) — all under `/home/ubuntu/screenshots/`.

## U5 — Admin issues a credential; anonymous verification says valid

**Steps:** issued `UAT Candidate 9012` / `UAT9012` / `BSc Testing` / `2024-06-15`, then verified the
returned hash while signed out.

**Expected:** row anchored `On chain` with status `Valid`; public verification shows `Valid` + on-chain
record.

**Actual:** success alert `Credential issued: 0x360a9987206c6ad889e846b58a0d2162568713b8d5edba185ee38df169a1dc46`;
new top row `On chain` / `Valid`. Anonymous verification showed green **Valid**, Student
`UAT Candidate 9012`, Degree `BSc Testing`, Institution `Example University`, Transaction
`0x2ec69501ef3c67d566002bdfcb28df960a483ca22f8e2c79b6df860765e98cc6`, On-chain record with
`Revoked on chain: No`.

**Result: PASS** — evidence: `/home/ubuntu/screenshots/ss_fbeb966c.png`,
`/home/ubuntu/screenshots/ss_5c2ac91a.png`.

## U6 — Admin revokes it; anonymous verification flips to revoked

**Steps:** clicked **Revoke** on that row, typed `UAT revocation` into the browser prompt, signed out
and re-verified the same hash.

**Expected:** admin row `Revoked` with the Revoke button disabled; public page shows `Revoked`, the
reason, and `Revoked on chain: Yes`.

**Actual:** green "Credential revoked" alert; the row's status chip became orange **Revoked** and the
Revoke button rendered `disabled`. Anonymous verification showed a **Revoked** chip,
`Revocation reason: UAT revocation`, and On-chain record `Revoked on chain: Yes`.

**Result: PASS** — evidence: `/home/ubuntu/screenshots/ss_c874fe59.png` (reason prompt),
`/home/ubuntu/screenshots/ss_d700eea9.png` (admin table), `/home/ubuntu/screenshots/ss_ab4d14b8.png`
(public revoked).

## U7 — Graduate role: sidebar scope, own credential, share QR, admin guard

**Steps:** signed in as `graduate@example.edu`; inspected the sidebar; opened **My credentials**;
clicked **Share**; then typed `/admin/users` into the address bar.

**Expected:** no Administration section; own credential listed; share dialog with QR and verification
link; `/admin/*` redirects away.

**Actual:** sidebar contained only `Verify a credential`, `Graduate ▸ My credentials`, `Account ▸
Account settings` and `Sign out (Jane Graduate)` — no Administration group. `/graduate` listed
`BSc Computer Science`, `Example University — 2024-06-30`, hash `0x929f06d4…`, chip `Valid`. The
**Share credential** dialog rendered a visible QR image plus the link
`http://localhost:3001/verify/0x929f06d4…`. Navigating to `/admin/users` redirected to `/`
(Verify a credential page); no admin table was rendered.

**Result: PASS** — evidence: `/home/ubuntu/screenshots/ss_a6ae8223.png` (graduate sidebar),
`/home/ubuntu/screenshots/ss_df0b65bb.png` (own credential),
`/home/ubuntu/screenshots/ss_4d9d80f9.png` (share QR + link),
`/home/ubuntu/screenshots/ss_cbc2f559.png` (admin route guard).

## U8 — Mobile viewport (~400 px)

**Steps:** signed in as admin on `/admin/credentials`, resized the browser window to ~420 px wide,
clicked `☰`, then clicked **Users** inside the drawer.

**Expected:** no permanent drawer, hamburger present, content not overlapped by the AppBar; the
temporary drawer opens, navigation works, the drawer closes itself.

**Actual:** the permanent drawer disappeared and a `☰` button (`aria-label="Open menu"`) appeared in
the AppBar; the `Credentials` heading was fully visible below the AppBar. `☰` opened a modal
temporary drawer with the same sections. Clicking **Users** navigated to `/admin/users`
(heading `Users`, "Create staff account" form and users table) and the drawer closed by itself.

**Result: PASS** — evidence: `/home/ubuntu/screenshots/ss_a723ec4a.png` (mobile, no permanent drawer),
`/home/ubuntu/screenshots/ss_67e82bf1.png` (drawer open),
`/home/ubuntu/screenshots/ss_a3eebc5e.png` (drawer closed after navigating to Users).

---

## Console health

Collected at the end of the run: only three React DevTools informational logs
("Download the React DevTools for a better development experience"). **No errors, warnings, or
unhandled rejections.** — PASS

## Defects

None observed during this UAT pass.

## Notes / residual state

- The credential `UAT Candidate 9012` (`UAT9012`, hash `0x360a9987…`) was issued and then revoked in
  the `univerify_test` database as part of U5/U6; revocation is irreversible. Re-run
  `npm run seed` against a fresh DB if a clean data set is required.
- The optional "register a file hash then re-upload to show valid" variant of U3 was not executed.
- Previously reported (earlier sessions, unchanged by this pass, outside UAT scope): the backend can
  silently fall back to off-chain storage and still report a credential as `Valid` if on-chain
  anchoring reverts, and the `not_found` card still renders an On-chain record block for hashes
  anchored on chain but absent from the database.
