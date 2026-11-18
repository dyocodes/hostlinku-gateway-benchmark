# Hostlinku ゲートウェイ ベンチマーク

[![CI](https://github.com/dyocodes/hostlinku-gateway-benchmark/actions/workflows/ci.yml/badge.svg)](https://github.com/dyocodes/hostlinku-gateway-benchmark/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Bahasa Indonesia](README.id.md) | **日本語** | [简体中文](README.zh-CN.md)

`https://api.hostlinku.com/v1/chat/completions` に対して **Time-To-First-Token (TTFT)**、**エンドツーエンド遅延（`p50`/`p95`）**、**トークン数**、**USD コスト** を再現可能に計測するベンチマーク CLI です。**Node.js (≥ 18)** と **Python（標準ライブラリのみ）** の両方を外部依存なしで提供します。

## クイックスタート

```bash
export HOSTLINKU_API_KEY=sk-your-api-key

# ストリーミング TTFT ベンチマーク（Node.js）
node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 48

# 非ストリーミング遅延 + USD コスト計測（Node.js）
node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 48 --mode chat

# Python 標準ライブラリ版（JSON 出力）
python benchmark.py --model claude-haiku-4-5 --runs 5 --json
```

## オプション

| フラグ | デフォルト | 説明 |
|---|---|---|
| `--model` | `gpt-5-5` | お使いのキーの Service Mode で利用可能な公開モデル slug。 |
| `--runs` | `3` | 連続実行回数（`1`〜`20`）。 |
| `--max-tokens` | `48` | コストを抑えるための出力トークン上限（`16`〜`512`）。 |
| `--mode` | `stream` | `stream` は SSE `TTFT` + 総所要時間、`chat` は USD コスト `hostlinku.cost` を記録。 |
| `--json` | `false` | 集計結果（`ttftP50Ms`、`ttftP95Ms`、`totalP50Ms`、`totalP95Ms`）を JSON 出力。 |

## 参考計測結果（2026-11-18）

**Economy** API キーを使用してクライアント端末から `https://api.hostlinku.com` へ直接実測した結果です（`max_tokens=32`、各テスト `runs=2`。特定時点の実測値であり SLA 保証ではありません）。

| コマンド | モデル | モード | p50 TTFT | p95 TTFT | p50 合計 | p95 合計 | 記録コスト / リクエスト |
|---|---|---|---|---|---|---|---|
| `node benchmark.mjs --model gpt-5-5 --runs 2 --max-tokens 32` | `gpt-5-5` | `stream` | `1646 ms` | `1913 ms` | `1816 ms` | `2108 ms` | `-` |
| `node benchmark.mjs --model gpt-5-5 --runs 2 --max-tokens 32 --mode chat` | `gpt-5-5` | `chat` | `-` | `-` | `2239 ms` | `2267 ms` | `$0.00007031` |
| `python benchmark.py --model claude-haiku-4-5 --runs 2 --max-tokens 32` | `claude-haiku-4-5` | `stream` | `2403 ms` | `9618 ms` | `2463 ms` | `9718 ms` | `-` |

遅延はクライアントの地域、負荷、Service Mode により変動するため、本番環境からの実行で確認してください。

## リンク

- ライブステータスページ: <https://status.hostlinku.com>
- USD コスト計算ツール: <https://github.com/dyocodes/hostlinku-cost-calculator>
- API サンプル集: <https://github.com/dyocodes/hostlinku-api-examples>
- ドキュメント: <https://docs.hostlinku.com/ja>

## ライセンス

[MIT](LICENSE)。スクリプトに API キーは含まれません。実行時には通常のトークン料金が発生します。
