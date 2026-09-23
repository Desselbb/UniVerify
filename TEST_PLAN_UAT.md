# UAT test plan — UniVerify (branch devin/1790136728-test-evidence)

Environment (already up): backend API :3010 (DB `univerify_test`, contract
`0x09635F643e140090A9A8Dcd712eD6285858ceBef` on anvil :8547), CRA dev server :3001 built with
`REACT_APP_API_URL=http://localhost:3010/api`. Seeded: admin@example.edu / graduate@example.edu
(password123), valid credential hash
`0x929f06d4e937e5b0f796b5735d6e37450b0fbdeb4c59363bd9095af463ca230f` (Jane Graduate).
App code is unchanged from master behaviour on this branch (diff = tests/docs only), so this is an
acceptance pass over merged PR #1 + PR #2 behaviour, not a change verification.

Code refs used to build the steps: `frontend/src/pages/VerifyPage.tsx:80-126` (hash form navigates to
`/verify/:hash`, dropzone accepts PDF/PNG/JPG, error rendered in an `Alert`),
`frontend/src/components/VerificationResultCard.tsx` (status chip + On-chain record),
`frontend/src/pages/AdminPage.tsx:99-212` (revoke uses `window.prompt` for the reason; status chip
Valid/Revoked), `frontend/src/pages/GraduatePage.tsx:72-93` (Share button → dialog with
`<img alt="Verification QR code">` + link), `frontend/src/components/Layout.tsx` (permanent drawer at
≥sm, `aria-label="Open menu"` hamburger < sm, items close the drawer on click).

## U1 — Anonymous verification of a valid hash
Signed out on `/`, paste the seeded hash and click **Verify**.
PASS: URL becomes `/verify/0x929f06…`; result card shows a green **Valid** chip, Student
`Jane Graduate`, Degree `BSc Computer Science`, Institution `Example University`, a **Transaction**
value starting `0xd50b5491`, and an **On-chain record** block with `Revoked on chain: No`.
FAIL: any other status chip, missing on-chain block, or a blank/error page.

## U2 — Anonymous verification of unknown and malformed hashes
a) Submit a well-formed but unknown hash (`0x` + 64 `a`).
PASS: red **Not found** chip with "No credential matches this hash."; no credential fields.
b) Submit `notahash`.
PASS: an error alert reading exactly **"Invalid credential hash"**, page stays interactive (form still
usable). FAIL: white screen, React error overlay, or a "valid" result.

## U3 — File-upload verification of an unregistered document
Click the dropzone and select `/home/ubuntu/uat/unregistered-diploma.pdf`.
PASS: one result card, chip **Not found**, and the displayed hash equals
`0x794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b` (sha256 of the file).
FAIL: a different hash, "valid", or an unhandled error.

## U4 — Admin sidebar navigation
Signed in as admin@example.edu, click each Administration item in the left drawer.
PASS: `/admin/credentials` heading `Credentials` with the "Issue a credential" form and table;
`/admin/institutions` heading `Institutions` listing `Example University`;
`/admin/users` heading `Users` with a row for `admin@example.edu`; `/admin/audit` heading `Audit log`
with ≥1 row. In each case the clicked sidebar item is the highlighted one.
FAIL: stale heading, wrong panel, or highlight not following the URL.

## U5 — Admin issues a credential, anonymous verify says valid
On `/admin/credentials` issue `UAT Candidate <ts>` / `UAT<ts>` / `BSc Testing` / `2024-06-15`.
PASS: green success alert containing the new hash; the new top row shows **On chain** and **Valid**.
Then open `/` and verify that hash while still recording (signed-out state re-checked in U6).
PASS: green **Valid** chip with Student `UAT Candidate <ts>` and an On-chain record block.
FAIL: row shows `Off chain`, or public verification returns not_found.

## U6 — Admin revokes it, anonymous verify flips to revoked
Back on `/admin/credentials`, click **Revoke** on that row and type `UAT revocation` into the
browser prompt.
PASS: row status chip changes to **Revoked** and the Revoke button becomes disabled. Sign out, then
verify the same hash on `/` as an anonymous visitor.
PASS: orange/red **Revoked** chip, `Revocation reason: UAT revocation`, and `Revoked on chain: Yes`.
FAIL: still shows Valid after revocation (this would be the headline defect).

## U7 — Graduate role: own credential, share QR, admin guard
Sign in as graduate@example.edu.
1. PASS: sidebar shows `Graduate ▸ My credentials` and `Account`, and contains **no** `Administration`
   heading and no Credentials/Institutions/Users/Audit items.
2. On `/graduate`: PASS: a card for Jane Graduate's credential (`BSc Computer Science`) is listed.
3. Click **Share**: PASS: dialog titled `Share credential` renders a visible QR image and a link
   containing `/verify/0x929f06d4`.
4. Address-bar navigate to `/admin/users`: PASS: redirected to `/` (Verify page); no admin table is
   rendered. FAIL: the Users table appears.

## U8 — Mobile viewport (~400 px)
Resize the browser to ~400 px wide while signed in as admin on `/admin/credentials`.
PASS: no permanent drawer; a `☰` button is visible in the AppBar; the `Credentials` heading is fully
visible below the AppBar (not overlapped).
Click `☰` → PASS: temporary drawer overlays the content with the same sections.
Click **Users** inside it → PASS: drawer closes by itself and `/admin/users` with heading `Users`
renders.
FAIL: drawer stays open, content hidden under the AppBar, or navigation does nothing.

## Console
After the run, collect the browser console. PASS: nothing beyond React DevTools info logs; explicitly
report any error, warning, or unhandled rejection.
