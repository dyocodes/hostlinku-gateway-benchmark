#!/usr/bin/env python3
"""Reproducible latency (TTFT & total duration p50/p95) and cost benchmark CLI
for POST /v1/chat/completions on Hostlinku (Python standard library only).

Usage:
  HOSTLINKU_API_KEY=sk-... python benchmark.py
  HOSTLINKU_API_KEY=sk-... python benchmark.py --model gpt-5-5 --runs 3 --json
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request


def percentile(values, p):
    if not values:
        return None
    s = sorted(values)
    idx = min(len(s) - 1, max(0, math.ceil((p / 100.0) * len(s)) - 1))
    return round(s[idx])


def run_once(base, api_key, model, max_tokens, mode, idx):
    stream = mode != "chat"
    body = {
        "model": model,
        "stream": stream,
        "max_tokens": max_tokens,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": "Reply with one short plain-text sentence."},
            {"role": "user", "content": f"Sample benchmark ping #{idx + 1}: define HTTP keep-alive concisely."},
        ],
    }
    if stream:
        body["stream_options"] = {"include_usage": True}

    req = urllib.request.Request(
        f"{base}/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "hostlinku-gateway-benchmark/0.1.0",
        },
        method="POST",
    )

    t0 = time.perf_counter()
    ttft_ms = None
    prompt_tokens = None
    completion_tokens = None
    cost_usd = None

    with urllib.request.urlopen(req, timeout=120) as resp:
        req_id = resp.headers.get("x-request-id")
        if not stream:
            data = json.load(resp)
            total_ms = round((time.perf_counter() - t0) * 1000)
            usage = data.get("usage") or {}
            hl = data.get("hostlinku") or {}
            return {
                "run": idx + 1,
                "status": resp.status,
                "ttftMs": None,
                "totalMs": total_ms,
                "promptTokens": usage.get("prompt_tokens"),
                "completionTokens": usage.get("completion_tokens"),
                "costUsd": hl.get("cost"),
                "requestId": req_id,
            }

        for raw in resp:
            line = raw.decode("utf-8").strip()
            if not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if payload == "[DONE]":
                break
            evt = json.loads(payload)
            choices = evt.get("choices") or []
            delta = choices[0].get("delta", {}).get("content") if choices else None
            if delta and ttft_ms is None:
                ttft_ms = round((time.perf_counter() - t0) * 1000)
            if evt.get("usage"):
                prompt_tokens = evt["usage"].get("prompt_tokens", prompt_tokens)
                completion_tokens = evt["usage"].get("completion_tokens", completion_tokens)
            if (evt.get("hostlinku") or {}).get("cost") is not None:
                cost_usd = evt["hostlinku"]["cost"]

        total_ms = round((time.perf_counter() - t0) * 1000)
        return {
            "run": idx + 1,
            "status": resp.status,
            "ttftMs": ttft_ms,
            "totalMs": total_ms,
            "promptTokens": prompt_tokens,
            "completionTokens": completion_tokens,
            "costUsd": cost_usd,
            "requestId": req_id,
        }


def main():
    parser = argparse.ArgumentParser(description="Hostlinku AI Gateway benchmark CLI")
    parser.add_argument("--model", default=os.environ.get("HOSTLINKU_MODEL", "gpt-5-5"))
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--max-tokens", type=int, default=48)
    parser.add_argument("--mode", choices=["stream", "chat"], default="stream")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    api_key = os.environ.get("HOSTLINKU_API_KEY")
    if not api_key:
        sys.exit("Set HOSTLINKU_API_KEY before running (see .env.example).")

    base = os.environ.get("HOSTLINKU_BASE_URL", "https://api.hostlinku.com").rstrip("/")
    if base.endswith("/v1"):
        base = base[:-3]

    runs = max(1, min(20, args.runs))
    max_tokens = max(16, min(512, args.max_tokens))

    try:
        results = [run_once(base, api_key, args.model, max_tokens, args.mode, i) for i in range(runs)]
    except urllib.error.HTTPError as err:
        sys.exit(f"HTTP {err.code}: {err.read().decode('utf-8', 'replace')}")

    ttfts = [r["ttftMs"] for r in results if r["ttftMs"] is not None]
    totals = [r["totalMs"] for r in results]
    summary = {
        "base": base,
        "model": args.model,
        "mode": args.mode,
        "runs": runs,
        "ttftP50Ms": percentile(ttfts, 50),
        "ttftP95Ms": percentile(ttfts, 95),
        "totalP50Ms": percentile(totals, 50),
        "totalP95Ms": percentile(totals, 95),
        "results": results,
    }
    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print(f"Hostlinku Benchmark ({args.model} | mode={args.mode} | runs={runs} | base={base})")
        for r in results:
            print(f"  #{r['run']}: ttft={r['ttftMs']}ms  total={r['totalMs']}ms  tokens={r['promptTokens']}/{r['completionTokens']}")
        print(f"Summary: p50_ttft={summary['ttftP50Ms']}ms  p95_ttft={summary['ttftP95Ms']}ms  p50_total={summary['totalP50Ms']}ms  p95_total={summary['totalP95Ms']}ms")


if __name__ == "__main__":
    main()
