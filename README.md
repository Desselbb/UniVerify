# Uni-Verify

Academic credential issuance and verification: an Express/PostgreSQL API, a Solidity credential
registry on a Hyperledger Besu dev chain, and a React frontend for public verification, university
administration, and graduate sharing.

## Prerequisites

- Docker + Docker Compose
- Node.js 20 (backend/frontend) and Node.js 22 (Hardhat only — e.g. `nvm use 22` inside `blockchain/`)

## 1. Start the infrastructure

```bash
cd docker
docker compose up -d postgres redis besu-node
```

Postgres listens on 5432, Redis on 6379, and the Besu JSON-RPC endpoint on 8545. Besu is reported as
`unhealthy` by Docker because its image has no `curl` for the healthcheck; confirm it is really up with:

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545
```

## 2. Deploy the smart contract

```bash
cd blockchain
npm install
source ~/.nvm/nvm.sh && nvm use 22
npx hardhat run scripts/deploy.ts --network localhost
```

Copy the printed address into `CONTRACT_ADDRESS` in `backend/.env`. If the contract ABI changed, refresh
`backend/src/config/CredentialRegistry.abi.json` from
`blockchain/artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json` (`.abi` field).

## 3. Start the backend

```bash
cd backend
npm install
cp .env.example .env   # then set CONTRACT_ADDRESS from step 2
npm run migrate
npm run seed
npm run dev            # or: node src/server.js
```

The API runs on http://localhost:3000; `curl http://localhost:3000/api/health` should report
`{"status":"ok"}` with database and blockchain up.

Seeded accounts (password `password123`):

| Email | Role |
| --- | --- |
| admin@example.edu | university admin |
| graduate@example.edu | graduate |

## 4. Start the frontend

```bash
cd frontend
npm install
cp .env.example .env   # PORT=3001, REACT_APP_API_URL=http://localhost:3000/api
npm start
```

Open http://localhost:3001. Port 3001 matters: the backend's `CORS_ORIGIN` points there.

## Tests and checks

```bash
cd backend  && npm test && npx eslint .
cd frontend && CI=true npm test && npm run build
cd blockchain && npx hardhat compile
```

## Running everything in Docker

`docker compose up -d` also builds and runs the backend and frontend images (frontend served by nginx on
http://localhost:3001). Use it only when you are not running the local dev servers — they bind the same
ports. The containerised backend needs `CONTRACT_ADDRESS` supplied through the compose environment.
