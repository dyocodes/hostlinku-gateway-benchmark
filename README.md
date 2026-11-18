# Hostlinku Gateway Benchmark

[![CI](https://github.com/dyocodes/hostlinku-gateway-benchmark/actions/workflows/ci.yml/badge.svg)](https://github.com/dyocodes/hostlinku-gateway-benchmark/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** | [Bahasa Indonesia](README.id.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

Reproducible CLI benchmark for measuring **Time-To-First-Token (TTFT)**, **end-to-end latency (`p50`/`p95`)**, **token counts**, and **USD request cost** against `https://api.hostlinku.com/v1/chat/completions`. Written with zero external dependencies in **Node.js (≥ 18)** and **Python (standard library)**.

## Quick start

```bash
export HOSTLINKU_API_KEY=sk-your-api-key

# Streaming TTFT benchmark (Node.js)
node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 48

# Non-streaming latency + USD cost benchmark (Node.js)
node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 48 --mode chat

# Python standard-library equivalent with JSON output
python benchmark.py --model claude-haiku-4-5 --runs 5 --json
```

## Options

| Flag | Default | Description |
|---|---|---|
| `--model` | `gpt-5-5` | Public model slug available for your key's Service Mode. |
| `--runs` | `3` | Sequential iterations (`1`–`20`). |
| `--max-tokens` | `48` | Output token cap (`16`–`512`) to keep benchmark spend minimal. |
| `--mode` | `stream` | `stream` measures SSE `TTFT` + total time; `chat` reports `hostlinku.cost` USD. |
| `--json` | `false` | Emit structured JSON summary (`ttftP50Ms`, `ttftP95Ms`, `totalP50Ms`, `totalP95Ms`). |

## Reference measurement (2026-11-18)

Measured directly from a client machine against `https://api.hostlinku.com` using an **Economy** API key (`max_tokens=32`, `runs=2` per test; point-in-time observation, not an SLA):

| Command | Model | Mode | p50 TTFT | p95 TTFT | p50 Total | p95 Total | Recorded Cost / Req |
|---|---|---|---|---|---|---|---|
| `node benchmark.mjs --model gpt-5-5 --runs 2 --max-tokens 32` | `gpt-5-5` | `stream` | `1646 ms` | `1913 ms` | `1816 ms` | `2108 ms` | `-` |
| `node benchmark.mjs --model gpt-5-5 --runs 2 --max-tokens 32 --mode chat` | `gpt-5-5` | `chat` | `-` | `-` | `2239 ms` | `2267 ms` | `$0.00007031` |
| `python benchmark.py --model claude-haiku-4-5 --runs 2 --max-tokens 32` | `claude-haiku-4-5` | `stream` | `2403 ms` | `9618 ms` | `2463 ms` | `9718 ms` | `-` |

Latency varies by client location, model load, Service Mode, and upstream routing; run the script from your own server to measure real latency for your workload.

## Links

- Live Status Page: <https://status.hostlinku.com>
- USD Cost Calculator: <https://github.com/dyocodes/hostlinku-cost-calculator>
- API Examples: <https://github.com/dyocodes/hostlinku-api-examples>
- Docs: <https://docs.hostlinku.com>

## License

[MIT](LICENSE). Benchmark scripts contain no API keys; running live tests incurs normal token usage on your key.
