#!/usr/bin/env node
/*
 * Closed-loop HTTP benchmark for the Uni-Verify API.
 *
 * Each scenario runs CONCURRENCY workers that issue requests back to back for
 * DURATION seconds; every response is timed individually so the reported
 * percentiles come from measured samples rather than an aggregate estimate.
 *
 *   BASE_URL=http://localhost:3000/api \
 *   BENCH_HASH=0x... BENCH_EMAIL=... BENCH_PASSWORD=... \
 *   CONCURRENCY=20 DURATION=20 node scripts/benchmark.js
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const CONCURRENCY = parseInt(process.env.CONCURRENCY, 10) || 20;
const DURATION = parseInt(process.env.DURATION, 10) || 20;
const WARMUP = parseInt(process.env.WARMUP, 10) || 3;
const HASH = process.env.BENCH_HASH;
const EMAIL = process.env.BENCH_EMAIL;
const PASSWORD = process.env.BENCH_PASSWORD;

const agents = {
  'http:': new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY * 2 }),
  'https:': new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY * 2 })
};

function requestOnce({ method = 'GET', path, body, headers = {} }) {
  const url = new URL(BASE_URL + path);
  const transport = url.protocol === 'https:' ? https : http;
  const payload = body === undefined ? null : JSON.stringify(body);
  const startedAt = process.hrtime.bigint();

  return new Promise((resolve) => {
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        agent: agents[url.protocol],
        headers: {
          ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
          ...headers
        }
      },
      (res) => {
        res.resume();
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            ms: Number(process.hrtime.bigint() - startedAt) / 1e6
          })
        );
      }
    );

    req.on('error', (error) =>
      resolve({ status: 0, error: error.message, ms: Number(process.hrtime.bigint() - startedAt) / 1e6 })
    );
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return null;
  }
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function runScenario(scenario) {
  const deadline = Date.now() + DURATION * 1000;
  const warmupUntil = Date.now() + WARMUP * 1000;
  const latencies = [];
  const statuses = {};
  let errors = 0;
  let measuredFrom = null;

  async function worker() {
    for (;;) {
      const now = Date.now();
      if (now >= deadline) {
        return;
      }
      const measuring = now >= warmupUntil;
      const result = await requestOnce(scenario.request);
      if (!measuring) {
        continue;
      }
      if (measuredFrom === null) {
        measuredFrom = Date.now();
      }
      latencies.push(result.ms);
      statuses[result.status] = (statuses[result.status] || 0) + 1;
      if (result.status === 0 || result.status >= 400) {
        errors += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const sorted = [...latencies].sort((a, b) => a - b);
  const elapsedSeconds = (Date.now() - (measuredFrom ?? Date.now() - 1)) / 1000;
  const round = (value) => (value === null ? null : Math.round(value * 100) / 100);

  return {
    scenario: scenario.name,
    endpoint: `${scenario.request.method || 'GET'} ${scenario.request.path}`,
    concurrency: CONCURRENCY,
    warmupSeconds: WARMUP,
    measuredSeconds: round(elapsedSeconds),
    requests: sorted.length,
    requestsPerSecond: round(sorted.length / Math.max(elapsedSeconds, 0.001)),
    errors,
    errorRate: round((errors / Math.max(sorted.length, 1)) * 100),
    statusCounts: statuses,
    latencyMs: {
      min: round(sorted[0] ?? null),
      mean: round(sorted.reduce((sum, value) => sum + value, 0) / Math.max(sorted.length, 1)),
      p50: round(percentile(sorted, 50)),
      p90: round(percentile(sorted, 90)),
      p95: round(percentile(sorted, 95)),
      p99: round(percentile(sorted, 99)),
      max: round(sorted[sorted.length - 1] ?? null)
    }
  };
}

async function main() {
  const scenarios = [
    { name: 'health check', request: { path: '/health' } }
  ];

  if (HASH) {
    scenarios.push({ name: 'public verification by hash', request: { path: `/verify/${HASH}` } });
    scenarios.push({
      name: 'public verification of an unknown hash',
      request: { path: `/verify/0x${'ab'.repeat(32)}` }
    });
  }

  if (EMAIL && PASSWORD) {
    scenarios.push({
      name: 'login (bcrypt work factor from env)',
      request: { method: 'POST', path: '/auth/login', body: { email: EMAIL, password: PASSWORD } }
    });
  }

  const results = [];
  for (const scenario of scenarios) {
    process.stderr.write(`running: ${scenario.name}\n`);
    results.push(await runScenario(scenario));
  }

  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        startedAt: new Date().toISOString(),
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        cpus: require('os').cpus().length,
        durationSecondsPerScenario: DURATION,
        results
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
