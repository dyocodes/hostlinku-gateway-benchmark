# Benchmark Gateway Hostlinku

[![CI](https://github.com/dyocodes/hostlinku-gateway-benchmark/actions/workflows/ci.yml/badge.svg)](https://github.com/dyocodes/hostlinku-gateway-benchmark/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | **Bahasa Indonesia** | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

CLI benchmark yang dapat direproduksi untuk mengukur **Time-To-First-Token (TTFT)**, **latensi total (`p50`/`p95`)**, **jumlah token**, dan **biaya USD per request** pada `https://api.hostlinku.com/v1/chat/completions`. Dibuat tanpa dependensi eksternal memakai **Node.js (≥ 18)** dan **Python (pustaka standar)**.

## Mulai cepat

```bash
export HOSTLINKU_API_KEY=sk-your-api-key

# Benchmark TTFT streaming (Node.js)
node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 48

# Benchmark latensi non-streaming + biaya USD (Node.js)
node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 48 --mode chat

# Versi Python (pustaka standar) dengan output JSON
python benchmark.py --model claude-haiku-4-5 --runs 5 --json
```

## Opsi

| Flag | Default | Keterangan |
|---|---|---|
| `--model` | `gpt-5-5` | Slug model publik yang tersedia pada Service Mode key Anda. |
| `--runs` | `3` | Jumlah iterasi berurutan (`1`–`20`). |
| `--max-tokens` | `48` | Batas token output (`16`–`512`) agar biaya uji tetap kecil. |
| `--mode` | `stream` | `stream` mengukur `TTFT` SSE + durasi total; `chat` mencetak `hostlinku.cost` USD. |
| `--json` | `false` | Keluarkan ringkasan JSON (`ttftP50Ms`, `ttftP95Ms`, `totalP50Ms`, `totalP95Ms`). |

## Hasil pengukuran referensi (2026-11-18)

Diukur langsung dari mesin klien ke `https://api.hostlinku.com` memakai API key **Economy** (`max_tokens=32`, `runs=2` per uji; catatan satu waktu, bukan jaminan SLA):

| Perintah | Model | Mode | p50 TTFT | p95 TTFT | p50 Total | p95 Total | Biaya / Req |
|---|---|---|---|---|---|---|---|
| `node benchmark.mjs --model gpt-5-5 --runs 2 --max-tokens 32` | `gpt-5-5` | `stream` | `1646 ms` | `1913 ms` | `1816 ms` | `2108 ms` | `-` |
| `node benchmark.mjs --model gpt-5-5 --runs 2 --max-tokens 32 --mode chat` | `gpt-5-5` | `chat` | `-` | `-` | `2239 ms` | `2267 ms` | `$0.00007031` |
| `python benchmark.py --model claude-haiku-4-5 --runs 2 --max-tokens 32` | `claude-haiku-4-5` | `stream` | `2403 ms` | `9618 ms` | `2463 ms` | `9718 ms` | `-` |

Latensi dipengaruhi lokasi klien, beban model, Service Mode, serta rute upstream; jalankan dari server Anda sendiri untuk angka yang sesuai beban kerja Anda.

## Tautan

- Status Layanan Live: <https://status.hostlinku.com>
- Kalkulator Biaya USD: <https://github.com/dyocodes/hostlinku-cost-calculator>
- Contoh API: <https://github.com/dyocodes/hostlinku-api-examples>
- Dokumentasi: <https://docs.hostlinku.com>

## Lisensi

[MIT](LICENSE). Skrip benchmark tidak menyimpan API key; menjalankan uji live memotong saldo sesuai pemakaian token.
