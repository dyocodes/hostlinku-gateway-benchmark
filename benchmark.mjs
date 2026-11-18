#!/usr/bin/env node
// Reproducible latency (TTFT & total duration p50/p95), throughput, and USD cost benchmark
// for POST /v1/chat/completions on Hostlinku (zero dependencies, Node >= 18).
//
// Usage:
//   HOSTLINKU_API_KEY=sk-... node benchmark.mjs
//   HOSTLINKU_API_KEY=sk-... node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 64 --json

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const jsonOut = args.includes("--json");
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(`Usage: HOSTLINKU_API_KEY=sk-... node benchmark.mjs [options]
  --model <slug>       Model slug (default: $HOSTLINKU_MODEL or gpt-5-5)
  --runs <n>           Number of streaming iterations (default: 3)
  --max-tokens <n>     max_tokens per request (default: 48)
  --mode <chat|stream> Benchmark streaming TTFT or non-stream cost+latency (default: stream)
  --json               Print JSON summary`);
  process.exit(0);
}

const apiKey = process.env.HOSTLINKU_API_KEY;
if (!apiKey) {
  console.error("Set HOSTLINKU_API_KEY before running (see .env.example).");
  process.exit(1);
}

const base = (process.env.HOSTLINKU_BASE_URL ?? "https://api.hostlinku.com").replace(/\/+$/, "").replace(/\/v1$/, "");
const model = flag("--model", process.env.HOSTLINKU_MODEL ?? "gpt-5-5");
const runs = Math.max(1, Math.min(20, Number(flag("--runs", "3")) || 3));
const maxTokens = Math.max(16, Math.min(512, Number(flag("--max-tokens", "48")) || 48));
const benchMode = flag("--mode", "stream");

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function runOnce(index) {
  const stream = benchMode !== "chat";
  const started = performance.now();
  let ttftMs = null;
  let completionTokens = null;
  let promptTokens = null;
  let costUsd = null;
  let requestId = null;

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "hostlinku-gateway-benchmark/0.1.0",
    },
    body: JSON.stringify({
      model,
      stream,
      ...(stream ? { stream_options: { include_usage: true } } : {}),
      max_tokens: maxTokens,
      temperature: 0,
      messages: [
        { role: "system", content: "Reply with one short plain-text sentence." },
        { role: "user", content: `Sample benchmark ping #${index + 1}: define HTTP keep-alive concisely.` },
      ],
    }),
  });

  requestId = res.headers.get("x-request-id");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  if (!stream) {
    const data = await res.json();
    const totalMs = performance.now() - started;
    promptTokens = data.usage?.prompt_tokens ?? null;
    completionTokens = data.usage?.completion_tokens ?? null;
    costUsd = data.hostlinku?.cost ?? null;
    return { run: index + 1, ok: true, status: res.status, ttftMs: null, totalMs, promptTokens, completionTokens, costUsd, requestId };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let chunksText = 0;
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (raw === "[DONE]") continue;
      const evt = JSON.parse(raw);
      const delta = evt.choices?.[0]?.delta?.content;
      if (delta) {
        if (ttftMs === null) ttftMs = performance.now() - started;
        chunksText += 1;
      }
      if (evt.usage) {
        promptTokens = evt.usage.prompt_tokens ?? promptTokens;
        completionTokens = evt.usage.completion_tokens ?? completionTokens;
      }
      if (evt.hostlinku?.cost != null) {
        costUsd = evt.hostlinku.cost;
      }
    }
  }
  const totalMs = performance.now() - started;
  return { run: index + 1, ok: true, status: res.status, ttftMs, totalMs, chunksText, promptTokens, completionTokens, costUsd, requestId };
}

const results = [];
for (let i = 0; i < runs; i += 1) {
  results.push(await runOnce(i));
}

const totals = results.map((r) => r.totalMs).sort((a, b) => a - b);
const ttfts = results.map((r) => r.ttftMs).filter((v) => v != null).sort((a, b) => a - b);
const totalCost = results.reduce((sum, r) => sum + (Number(r.costUsd) || 0), 0);

const summary = {
  base,
  model,
  mode: benchMode,
  runs,
  succeeded: results.length,
  ttftP50Ms: ttfts.length ? Math.round(percentile(ttfts, 50)) : null,
  ttftP95Ms: ttfts.length ? Math.round(percentile(ttfts, 95)) : null,
  totalP50Ms: Math.round(percentile(totals, 50)),
  totalP95Ms: Math.round(percentile(totals, 95)),
  totalCostUsd: totalCost > 0 ? Number(totalCost.toFixed(8)) : null,
  results: results.map((r) => ({ ...r, ttftMs: r.ttftMs != null ? Math.round(r.ttftMs) : null, totalMs: Math.round(r.totalMs) })),
};

if (jsonOut) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Hostlinku Benchmark (${model} | mode=${benchMode} | runs=${runs} | base=${base})`);
  for (const r of summary.results) {
    console.log(`  #${r.run}: ttft=${r.ttftMs ?? "-"}ms  total=${r.totalMs}ms  tokens=${r.promptTokens ?? "?"}/${r.completionTokens ?? "?"}  cost=${r.costUsd != null ? `$${r.costUsd}` : "-"}`);
  }
  console.log(`Summary: p50_ttft=${summary.ttftP50Ms ?? "-"}ms  p95_ttft=${summary.ttftP95Ms ?? "-"}ms  p50_total=${summary.totalP50Ms}ms  p95_total=${summary.totalP95Ms}ms`);
}
