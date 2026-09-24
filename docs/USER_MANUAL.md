# UniVerify — User Manual

Academic credential issuance and verification system.

- Web application: <https://univerify-web.onrender.com>
- API base URL: <https://univerify-api.onrender.com/api>

> The hosted instance runs on a free tier: the first request after ~15 minutes of
> inactivity takes about a minute while the service wakes up. This is normal.

---

## 1. Who uses UniVerify

| Role | Sign-in required | What they can do |
| --- | --- | --- |
| **Public verifier** (employer, embassy, anyone) | No | Verify a credential by hash or by uploading the certificate file; download a verification report |
| **Graduate** | Yes | View their own credentials, generate a QR/share link, manage their account and two-factor authentication |
| **University administrator** | Yes | Issue credentials, search them, revoke them, manage institution staff accounts, read the audit log |
| **System administrator** | Yes | Everything a university administrator can do, plus manage institutions across the platform |

Roles are assigned, not chosen: public sign-up always creates a **graduate**
account. Staff accounts are created by an administrator from **Administration →
Users**.

---

## 2. Key concepts

**Credential hash** — the identity of a credential. It is the SHA-256 digest of
five fields, lower-cased and trimmed:

```
studentName | studentId | degree | graduationDate | institutionId
```

Re-typing exactly the same five fields always reproduces the same hash; changing
any character produces a different, unknown hash. The hash is what you type,
scan or share to look a credential up.

**File hash** — when you upload a document to the verify page, the system takes
a plain SHA-256 of the file's raw bytes. A document therefore verifies only if
those exact bytes were registered. Re-saving, re-exporting or printing-to-PDF a
valid certificate changes its bytes and it will no longer verify by upload — the
printed hash still will.

**Blockchain transaction hash** — the receipt of the transaction that wrote the
credential hash into the on-chain registry. It says *when and where* a credential
was anchored; it is not derived from the credential's contents and is not used
for lookup.

**Verification statuses**

| Status | Meaning |
| --- | --- |
| **Valid** | The hash is registered and has not been revoked |
| **Revoked** | The credential exists but the issuing institution has withdrawn it; the reason is shown |
| **Not found** | No credential matches this hash (unknown, mistyped, or a tampered file) |

---

## 3. Verifying a credential (no account needed)

Open <https://univerify-web.onrender.com>. The verification page is the home page.

![Verification page](https://app.devin.ai/attachments/03eee8a2-204b-4e4f-bbf9-ffa9de889421/ss_b64526d8.png)

### 3.1 Verify by hash

1. Paste the credential hash (it starts with `0x`) into **Credential hash**.
2. Click **Verify**.

A green **Valid** card shows the holder's name, degree, program, honours,
graduation date and institution, the blockchain transaction, and an **On-chain
record** block with the issuer address, institution id, issue time and whether
the credential is revoked on chain.

![Valid result](https://app.devin.ai/attachments/26d2e34b-c4d7-492c-833e-69ee1641c9d2/ss_03e28c3d.png)

The page address becomes `…/verify/<hash>`, so the result can be bookmarked or
sent to someone else.

### 3.2 Verify by uploading the document

Drag the certificate onto the dashed area, or click it and pick a file. PDF, PNG
and JPG are accepted, up to 10 files at once for bulk checking.

Each file is checked separately and gets its own result card, labelled with the
file name. An unregistered or altered document returns **Not found**, together
with the hash that was computed from the file you supplied — you can compare it
with `sha256sum yourfile.pdf` on your own machine.

### 3.3 Reading a negative result

An unknown hash gives a red **Not found** card reading "No credential matches
this hash." A malformed value (anything that is not a `0x`-prefixed
64-character hex string) is rejected by the server with the error "Invalid
credential hash", shown as a red banner above the results.

![Not found](https://app.devin.ai/attachments/d7c6f35c-16cc-42de-a0f5-9d54046f805c/ss_b6375473.png)

### 3.4 Download a verification report

On any **Valid** or **Revoked** result, click **Download verification report** to
get a PDF stating the credential's status, its data and its on-chain anchoring —
suitable for attaching to an application file.

### 3.5 Verifying from the command line

```bash
curl https://univerify-api.onrender.com/api/verify/0xYOURHASH
curl -F file=@certificate.pdf https://univerify-api.onrender.com/api/verify/file
```

---

## 4. Signing in

1. Click **Sign in** in the top bar (or open `/login`).
2. Enter your email and password.
3. If two-factor authentication is enabled on your account, a field for the
   6-digit authenticator code appears — enter it and submit again.

Forgotten password: click **Forgot password**, enter your email and follow the
reset link. For privacy the response is identical whether or not the address is
registered.

New graduates without an account can use **Register**. Registration always
creates a graduate account, regardless of what is requested.

After signing in, a sidebar appears on the left with only the sections your role
allows. On a narrow screen it collapses behind the **☰** button.

![Graduate sidebar](https://app.devin.ai/attachments/4c16cf7b-09be-4ecd-991f-3b8067f59cc0/ss_a6ae8223.png)

---

## 5. Graduate guide

### 5.1 View your credentials

Sidebar → **Graduate → My credentials**. Each card shows the degree, institution,
graduation date, the credential hash and a status chip (**Valid** or **Revoked**).

![Graduate credential list](https://app.devin.ai/attachments/24a8a28f-b3ea-4521-b1ef-f064efd6c354/ss_df0b65bb.png)

### 5.2 Share a credential

Click **Share** on the credential. A dialog opens with a QR code and a public
verification link of the form `https://univerify-web.onrender.com/verify/<hash>`.
Send the link, or print the QR code on your CV.

![Share dialog with QR code](https://app.devin.ai/attachments/1670d1f6-af7e-4ecd-93bc-10d16acde4fb/ss_4d9d80f9.png)

Anyone holding that link can see the credential's details without signing in.
Treat it like a document you are handing over: share it deliberately.

### 5.3 Account settings and two-factor authentication

Sidebar → **Account → Account settings**.

- **Profile** — change your full name or email, then **Save changes**.
- **Two-factor authentication** — click **Set up authenticator**, scan the QR code
  with Google Authenticator / Authy / 1Password, enter the 6-digit code and click
  **Enable**. Store the backup codes shown during setup somewhere safe.

---

## 6. University administrator guide

Sidebar → **Administration**, with four sections: Credentials, Institutions,
Users and Audit log. Each has its own address (`/admin/credentials`,
`/admin/institutions`, `/admin/users`, `/admin/audit`) and can be bookmarked.

![Administration – credentials](https://app.devin.ai/attachments/a2109640-cd2a-4052-9047-4f92efbafa75/ss_8139eef6.png)

### 6.1 Issue a credential

In **Administration → Credentials**, fill in the *Issue a credential* form:

| Field | Required | Notes |
| --- | --- | --- |
| Student name | Yes | Exactly as it should appear on the certificate |
| Student ID | Yes | Your institution's identifier for the graduate |
| Degree | Yes | e.g. `BSc Computer Science` |
| Graduation date | Yes | Date picker |
| Program | No | e.g. `Computer Science` |
| Honors | No | e.g. `First Class` |

Click **Issue credential**. On success a green banner shows the new credential
hash, and the credential appears in the table below marked **On chain** / **Valid**.

![Newly issued credential](https://app.devin.ai/attachments/4c7d22a5-2b77-4413-ab0d-92e49fc6e23a/ss_fbeb966c.png)

Give that hash (or the verification link built from it) to the graduate. The same
five fields always produce the same hash, so re-issuing an identical credential is
rejected as a duplicate.

### 6.2 Find a credential

Use **Search by name, student ID or hash**, then **Search**. The table lists the
student, degree, graduation date, whether it is anchored on chain, its status and
the available actions.

### 6.3 Revoke a credential

1. Find the credential in the table.
2. Click **Revoke** on its row.
3. Type the reason when prompted (e.g. *Award rescinded following academic
   misconduct review*) and confirm.

![Revocation reason prompt](https://app.devin.ai/attachments/f60a7961-e34b-4d79-bca6-e01b8f542201/ss_c874fe59.png)

The row switches to **Revoked**, the Revoke button is disabled, and public
verification of that hash immediately returns **Revoked** with the reason and
`Revoked on chain: Yes`.

![Public result after revocation](https://app.devin.ai/attachments/8696ffd3-c9ca-4497-817e-0e0aab5aa5d3/ss_ab4d14b8.png)

**Revocation is permanent** — there is no un-revoke. If a credential was revoked
in error, issue it again (the hash will be identical only if all five fields are).

### 6.4 Manage staff accounts

**Administration → Users** lists the accounts of your institution and has a form
to create a new one: full name, email, temporary password and role. Give the new
member their temporary password out of band and ask them to change it under
Account settings.

![Users panel](https://app.devin.ai/attachments/9feed752-8f02-4c6c-9483-784bac809ceb/ss_d87720a6.png)

Two rules are enforced by the server and cannot be bypassed from the form:

- A university administrator cannot create a **system administrator**.
- New accounts are always attached to **your own** institution, even if another
  institution id is submitted.

### 6.5 Institutions

**Administration → Institutions** lists registered institutions with their
registration code and contact email, and (for system administrators) allows
registering a new one.

![Institutions panel](https://app.devin.ai/attachments/74e9cb5c-e53a-4764-8830-99ed8dcca4e2/ss_177b1319.png)

### 6.6 Audit log

**Administration → Audit log** records who did what and when: issuance,
revocation, logins and public verification requests. Use it for compliance
reporting and incident review.

![Audit log](https://app.devin.ai/attachments/b94f9bb4-2375-4cf4-9df2-407880e060d5/ss_f378af14.png)

---

## 7. Using UniVerify on a phone

The layout is responsive. The sidebar is replaced by a **☰** button in the top
bar; tapping it slides the menu in, and tapping an entry navigates and closes it
again.

![Mobile navigation drawer](https://app.devin.ai/attachments/e6162e88-f3fd-4c5b-992f-f1526f37f2e0/ss_67e82bf1.png)

---

## 8. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| The first page load hangs for up to a minute | Free-tier service waking from idle. Wait; it only happens after a period of inactivity. |
| "Invalid credential hash" | The value is not a `0x` + 64 hex-character string. Check for missing characters or a truncated copy-paste. |
| A genuine certificate returns **Not found** on upload | The file's bytes changed (re-saved, re-exported, scanned, compressed). Verify by hash instead. |
| The hash verifies but the PDF does not | Expected: the credential was issued from data fields, not from that file. Only documents whose bytes were registered verify by upload. |
| **Revoked** when you expect valid | The issuing institution withdrew the credential; the reason is on the result card. |
| A graduate cannot open an `/admin/...` page | Role restriction. Graduates are redirected to the verification page; ask an administrator for a staff account. |
| You changed something but the site looks the same | Cached bundle — hard-refresh with `Ctrl+Shift+R`. |
| The transaction hash changed for an existing credential | On the free hosted tier the chain is ephemeral and credentials are re-anchored on restart. Credential hashes never change. |

---

## 9. Running UniVerify yourself

From a clone of the repository (full detail in `README.md`):

```bash
cd docker && docker compose up -d postgres redis besu-node
cd ../blockchain && nvm use 22 && npx hardhat run scripts/deploy.ts --network localhost
#   → copy the printed address into CONTRACT_ADDRESS in backend/.env
cd ../backend && npm install && cp .env.example .env && npm run migrate && npm run seed && npm run dev
cd ../frontend && npm install && cp .env.example .env && npm start
```

The API listens on <http://localhost:3000> and the web app on
<http://localhost:3001> (keep that port — the backend's `CORS_ORIGIN` points at
it).

---

## 10. What verification does and does not prove

UniVerify proves that a given hash was **registered by an authorised issuer and
has not been revoked**, and that the registration is anchored in the blockchain
registry with a timestamp.

It does **not** currently prove issuer identity cryptographically: credentials are
not digitally signed, and all anchoring transactions are sent by one shared
service key. It also cannot tell you anything about a document that was never
registered — an unknown hash simply returns **Not found**.
