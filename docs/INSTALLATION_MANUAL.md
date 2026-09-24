# UniVerify — Installation Manual

This manual installs UniVerify from source: the PostgreSQL database, the
blockchain node and `CredentialRegistry` contract, the Express API, and the
React web application. It covers three routes:

- **A. Local development install** (recommended, section 3) — services in
  Docker, API and web app run from source with hot reload.
- **B. All-in-Docker install** (section 6) — every component in containers.
- **C. Hosted install on Render free tier** (section 7) — what the public
  instance at <https://univerify-web.onrender.com> actually runs.

Everything below is taken from the repository as it stands; command output
quoted here is what a correct install prints.

---

## 1. Prerequisites

| Requirement | Version | Used by | Check |
| --- | --- | --- | --- |
| Node.js | 20.x | backend, frontend | `node -v` |
| Node.js | 22.x | Hardhat only | `nvm use 22 && node -v` |
| npm | 10.x (ships with Node 20) | all | `npm -v` |
| Docker Engine | 24+ | Postgres, Redis, Besu | `docker --version` |
| Docker Compose | v2 (`docker compose`, not `docker-compose`) | infrastructure | `docker compose version` |
| git | any | clone | `git --version` |

Hardhat 3 refuses to run on Node 20, and the backend's native modules
(`bcrypt`, `sharp`) are built for Node 20 — so keep the two versions side by
side with [nvm](https://github.com/nvm-sh/nvm) rather than upgrading globally:

```bash
nvm install 20
nvm install 22
nvm alias default 20
```

Ports that must be free: **5432** (Postgres), **6379** (Redis), **8545** (chain
RPC), **3000** (API), **3001** (web app). Port 3001 is not optional for the web
app — the API's `CORS_ORIGIN` defaults to `http://localhost:3001`.

Disk: roughly 2 GB for `node_modules` across the three packages plus the Docker
images.

---

## 2. Get the source

```bash
git clone https://github.com/Desselbb/UniVerify.git
cd UniVerify
```

Layout:

```
backend/     Express API, Sequelize models, migration and seed scripts
frontend/    React (Create React App, TypeScript) web application
blockchain/  Hardhat project: CredentialRegistry.sol, deploy script
docker/      docker-compose.yml and the backend/frontend Dockerfiles
docs/        this manual, the user manual, test evidence
```

---

## 3. Route A — local development install

### 3.1 Start the infrastructure

```bash
cd docker
docker compose up -d postgres redis besu-node
```

This starts PostgreSQL 15 (user `postgres`, password `password`, database
`univerify`), Redis 7, and a Hyperledger Besu 23.10 node on the `dev` network
with mining enabled and zero gas price.

Docker reports **besu-node as `unhealthy`** and that is expected: the Besu image
has no `curl`, so its healthcheck can never pass. Confirm the node yourself:

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

A JSON response containing a `result` block number means the chain is up.

### 3.2 Deploy the smart contract

Hardhat needs Node 22:

```bash
cd ../blockchain
npm install
source ~/.nvm/nvm.sh && nvm use 22
npx hardhat run scripts/deploy.ts --network localhost
```

Output:

```
CredentialRegistry deployed at: 0x<address>
```

Copy that address — it goes into `CONTRACT_ADDRESS` in the next step.

The deployer key is the contract **owner and first registrar**. If you later
point the API at a different signing key, re-run the deploy with that key's
address exported so it is authorised to register institutions:

```bash
BACKEND_ADDRESS=0x<backend signer address> npx hardhat run scripts/deploy.ts --network localhost
```

If you change `CredentialRegistry.sol`, refresh the ABI the backend reads:
copy the `.abi` field of
`blockchain/artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json`
into `backend/src/config/CredentialRegistry.abi.json`.

### 3.3 Install and configure the API

```bash
cd ../backend
nvm use 20
npm install
cp .env.example .env
```

Edit `.env` and set at minimum:

```ini
CONTRACT_ADDRESS=0x<address printed in step 3.2>
JWT_SECRET=<a long random string>
```

Generate a secret with `openssl rand -hex 32`. The shipped placeholder
(`your-super-secret-jwt-key-change-this`) must not be used anywhere reachable
from a network — anyone holding it can mint valid access tokens.

Full variable reference in section 4.

### 3.4 Create the schema and seed data

```bash
npm run migrate
npm run seed
```

Both scripts call Sequelize's `sync`, so `migrate` creates or alters the tables
(it does not run versioned migration files), and `seed` inserts the demo
institution, the demo accounts, and one credential for *Jane Graduate*, which it
also anchors on chain — so a fresh install has something that verifies. If the
chain is unreachable, seeding still succeeds and logs "Could not anchor seed
credential on chain"; the credential then exists off-chain only.

Seeded accounts, password `password123`:

| Email | Role |
| --- | --- |
| `admin@example.edu` | university admin |
| `graduate@example.edu` | graduate |

Change both passwords before exposing the instance to anyone.

### 3.5 Run the API

```bash
npm run dev      # nodemon; or: npm start
```

Verify:

```bash
curl http://localhost:3000/api/health
```

Expected — both checks must read as up:

```json
{"status":"ok","checks":{"database":"up","blockchain":"up"},"uptime":12.3}
```

If either check is down the endpoint answers **HTTP 503** with
`"status":"degraded"`. `"blockchain":"down"` means `BLOCKCHAIN_NODE_URL` is
wrong or the node is unreachable; the API still serves requests, but issuance
cannot anchor.

### 3.6 Run the web application

```bash
cd ../frontend
npm install
cp .env.example .env    # PORT=3001, REACT_APP_API_URL=http://localhost:3000/api
npm start
```

Open <http://localhost:3001> and sign in with a seeded account. Note that CRA
reads `.env` only at start-up — restart `npm start` after editing it, and
rebuild (not just restart) for a production bundle, since `REACT_APP_*` values
are baked into the build.

### 3.7 Confirm the install

1. Sign in as `graduate@example.edu`, copy the hash of the seeded *Jane
   Graduate* credential, sign out, and paste it on the home page → **Valid**,
   with an on-chain transaction hash.
2. Sign in as `admin@example.edu` → Credentials → issue a test credential →
   verify its hash → **Valid**.
3. Revoke it → verify again → **Revoked**.

If all three behave as described, the database, API, contract and web app are
correctly wired together.

---

## 4. Environment variable reference (`backend/.env`)

| Variable | Default in `.env.example` | Meaning |
| --- | --- | --- |
| `NODE_ENV` | `development` | Standard Node environment name. |
| `PORT` | `3000` | API listen port. |
| `BLOCKCHAIN_NODE_URL` | `http://localhost:8545` | JSON-RPC endpoint of the chain. |
| `BLOCKCHAIN_PRIVATE_KEY` | dev key `0x…0001` | Key the API signs anchoring transactions with. Must be funded and a registrar on the contract. |
| `CONTRACT_ADDRESS` | zero address | Deployed `CredentialRegistry` address — **must be set**. |
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/univerify` | Postgres connection string. |
| `DATABASE_POOL_SIZE` | `20` | Maximum Sequelize pool connections. |
| `DATABASE_SSL` | unset | Set `true` for managed Postgres that requires TLS (Render). |
| `REDIS_URL` | `redis://localhost:6379` | Configured but not required by any request path today. |
| `JWT_SECRET` | placeholder | Signing key for access tokens — **must be changed**. |
| `JWT_EXPIRY` | `900` | Access-token lifetime in seconds. |
| `BCRYPT_WORK_FACTOR` | `12` | Password hashing cost. Do not lower it outside benchmarks. |
| `MFA_ENABLED` | `true` | Enables TOTP enrolment in account settings. |
| `MAX_FILE_SIZE` | `10485760` | Upload limit in bytes (10 MB). |
| `ALLOWED_FILE_TYPES` | `.pdf,.png,.jpg,.jpeg` | Accepted upload extensions. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Gmail placeholders | Present in config only; no mail is sent by the current code. |
| `AUDIT_ENABLED` | `true` | Writes administrative actions to the audit log. |
| `AUDIT_LOG_LEVEL` | `info` | Log level for audit entries. |
| `RATE_LIMIT_WINDOW` | `3600000` | Rate-limit window in ms (1 hour). |
| `RATE_LIMIT_MAX` | `100` | Requests allowed per window, per instance (in-memory, not shared across instances). |
| `CORS_ORIGIN` | `http://localhost:3001` | Exact origin allowed to call the API. |
| `AUTO_BOOTSTRAP` | unset | `true` makes the API sync the schema, seed, deploy the registry and re-anchor all credentials on boot. Intended for ephemeral hosts; leave unset locally. |
| `CHAIN_RECONCILE_INTERVAL` | `60000` | How often (ms) the API checks whether the registry vanished and redeploys it. Only with `AUTO_BOOTSTRAP=true`. |

`frontend/.env`:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3001` | Dev-server port; must match the API's `CORS_ORIGIN`. |
| `REACT_APP_API_URL` | `http://localhost:3000/api` | API base URL, compiled into the bundle. |

---

## 5. Post-install checks

```bash
cd backend    && npm test && npx eslint src scripts
cd ../frontend && CI=true npm test && npm run build
cd ../blockchain && nvm use 22 && npx hardhat compile
```

A production frontend bundle lands in `frontend/build/` and can be served by
any static web server.

---

## 6. Route B — all-in-Docker install

From `docker/`:

```bash
docker compose up -d
```

This additionally builds the API image (`node:20-alpine`) and the web image
(a CRA build served by nginx on <http://localhost:3001>).

Two things to know before using this route:

1. It binds the same host ports as the dev servers — stop those first.
2. The composed `backend` service receives only `NODE_ENV`, `DATABASE_URL`,
   `REDIS_URL` and `BLOCKCHAIN_NODE_URL`. You must add `CONTRACT_ADDRESS`,
   `JWT_SECRET` and `CORS_ORIGIN` to its `environment:` block, and the
   `depends_on` condition `besu-node: service_healthy` will never be satisfied
   while the healthcheck uses `curl` (section 3.1) — relax it to
   `service_started` or remove it.

The compose file is a development convenience, not a production deployment:
credentials are hard-coded and no image is pinned by digest.

---

## 7. Route C — hosted install (Render free tier)

This is how the public instance is deployed. Three Render resources in one
account, all on free plans:

**1. PostgreSQL** — create a Render PostgreSQL instance and copy its *internal*
connection string.

**2. Web service `univerify-api`** — from the repository, root directory
`backend`:

| Setting | Value |
| --- | --- |
| Environment | Node |
| Build command | `./render-build.sh` |
| Start command | `./render-start.sh` |
| Auto-deploy | on (otherwise merges do not reach the service) |

Environment variables: `DATABASE_URL` (the internal string), `DATABASE_SSL=true`,
`JWT_SECRET`, `AUTO_BOOTSTRAP=true`, `CORS_ORIGIN=https://<your web
service>.onrender.com`, `BLOCKCHAIN_NODE_URL=http://127.0.0.1:8545`, and a
`BLOCKCHAIN_PRIVATE_KEY`. `CONTRACT_ADDRESS` is *not* set — the bootstrap
deploys the registry itself on every boot.

Why this shape: the free plan has no persistent disk and stops idle instances,
so `render-build.sh` installs Foundry's `anvil` alongside the API and
`render-start.sh` runs it on `127.0.0.1:8545` in the same container. On boot the
API syncs the schema, seeds demo data, deploys `CredentialRegistry` and
re-anchors every stored credential; a background reconciler redeploys the
registry if the chain is reset while the API keeps running.

**3. Static site `univerify-web`** — from the repository, root directory
`frontend`:

| Setting | Value |
| --- | --- |
| Build command | `npm ci && npm run build` |
| Publish directory | `build` |
| Rewrite rule | `/*` → `/index.html` (rewrite) — required for client-side routes such as `/admin/credentials` |
| Auto-deploy | on |

Environment variable: `REACT_APP_API_URL=https://<your api
service>.onrender.com/api`. Because it is compiled into the bundle, changing it
requires a rebuild, not a restart.

Consequences of the free tier, all visible to users:

- The first request after ~15 minutes idle takes about a minute while the
  instance restarts and the chain is rebuilt.
- Credential hashes persist in Postgres, but **blockchain transaction hashes
  change after every restart** because the chain is recreated.
- The chain is bound to `127.0.0.1`, so nothing outside the API container can
  read or write the registry.

---

## 8. Upgrading an existing install

```bash
git pull
cd backend    && npm install && npm run migrate
cd ../frontend && npm install && npm run build   # or restart npm start
```

If the pull touched `blockchain/contracts/`, redeploy the contract (section 3.2),
refresh the ABI, and update `CONTRACT_ADDRESS`. Credentials anchored against the
old address are not visible to the new one, so on a development chain the
cleanest path is `docker compose down -v` followed by a fresh migrate/seed.

---

## 9. Uninstall / reset

```bash
cd docker
docker compose down          # stop containers, keep data
docker compose down -v       # also delete the Postgres, Redis and Besu volumes
```

`down -v` destroys all credentials and accounts. To reset only the application
data, drop and recreate the database and re-run `npm run migrate && npm run seed`.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `besu-node` shown as `unhealthy` | image has no `curl` for the healthcheck | expected; test the RPC with the `curl` command in 3.1 |
| Backend container never starts in compose | it waits for the Besu healthcheck | relax `depends_on` to `service_started` (section 6) |
| `npx hardhat` fails on start-up | running under Node 20 | `nvm use 22` inside `blockchain/` |
| `npm install` fails building `bcrypt` or `sharp` | running under Node 22 | `nvm use 20` inside `backend/` |
| Health check reports `"blockchain":"down"` | wrong `BLOCKCHAIN_NODE_URL`, or `CONTRACT_ADDRESS` still the zero address | set both, restart the API |
| Issuance fails with a revert | the API's signing key is not a registrar on the contract | redeploy with `BACKEND_ADDRESS=<signer>` (section 3.2) |
| Browser console shows a CORS error | `CORS_ORIGIN` does not exactly match the page origin | set it to the exact scheme+host+port, restart the API |
| Login returns 401 with correct details | database was re-seeded, or passwords were changed | re-run `npm run seed` on a fresh database |
| Requests start returning 429 | rate limit of `RATE_LIMIT_MAX` per window reached | wait out the window or raise the limit for local testing |
| Web app loads but every call fails | `REACT_APP_API_URL` points at the wrong host, or the API is not running | fix `.env` and restart/rebuild the frontend |
| Deep link such as `/admin/credentials` 404s in production | static host has no SPA rewrite | add `/*` → `/index.html` |

---

## 11. Security notes before any real deployment

The defaults in this repository are development defaults. At minimum:

- Replace `JWT_SECRET` and both seeded account passwords; remove the seeded
  demo accounts entirely if the instance is public.
- Replace the Postgres credentials hard-coded in `docker/docker-compose.yml`.
- Keep `BCRYPT_WORK_FACTOR` at 12 or higher.
- Do not expose the chain's RPC port publicly: anything that can write to the
  registry can anchor arbitrary hashes.
- `DATABASE_SSL=true` currently connects with `rejectUnauthorized: false`, so
  the database certificate is not validated — acceptable only on a provider's
  private network.
- Credentials are not digitally signed by the issuing institution, and every
  anchoring transaction is sent by one shared service key; verification proves
  that a hash was registered by this system, not who issued it.
