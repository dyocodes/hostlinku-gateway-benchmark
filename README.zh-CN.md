# Hostlinku 网关延迟与成本基准测试

[![CI](https://github.com/dyocodes/hostlinku-gateway-benchmark/actions/workflows/ci.yml/badge.svg)](https://github.com/dyocodes/hostlinku-gateway-benchmark/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Bahasa Indonesia](README.id.md) | [日本語](README.ja.md) | **简体中文**

用于测量 `https://api.hostlinku.com/v1/chat/completions` 的 **首字延迟（TTFT）**、**端到端耗时（`p50`/`p95`）**、**token 用量** 和 **单次请求 USD 费用** 的可复现 CLI 工具。提供零外部依赖的 **Node.js (≥ 18)** 与 **Python（仅标准库）** 实现。

## 快速开始

```bash
export HOSTLINKU_API_KEY=sk-your-api-key

# 流式 TTFT 基准测试（Node.js）
node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 48

# 非流式延迟 + USD 成本测试（Node.js）
node benchmark.mjs --model gpt-5-5 --runs 5 --max-tokens 48 --mode chat

# Python 标准库版本（输出 JSON）
python benchmark.py --model claude-haiku-4-5 --runs 5 --json
```

## 参数说明

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--model` | `gpt-5-5` | 当前密钥 Service Mode 下可用的公开模型 slug。 |
| `--runs` | `3` | 连续测试轮次（`1`–`20`）。 |
| `--max-tokens` | `48` | 限制输出 token 上限（`16`–`512`），控制测试开销。 |
| `--mode` | `stream` | `stream` 统计 SSE `TTFT` 与总耗时；`chat` 返回 `hostlinku.cost` USD 成本。 |
| `--json` | `false` | 输出结构化 JSON 摘要（`ttftP50Ms`、`ttftP95Ms`、`totalP50Ms`、`totalP95Ms`）。 |

## 参考实测数据（2026-11-18）

使用 **Economy** API Key 从客户端直接向 `https://api.hostlinku.com` 实测得到（`max_tokens=32`，每项 `runs=2`；仅为特定时间点观测结果，非 SLA 承诺）：

| 命令 | 模型 | 模式 | p50 TTFT | p95 TTFT | p50 总耗时 | p95 总耗时 | 实测单次成本 |
|---|---|---|---|---|---|---|---|
| `node benchmark.mjs --model gpt-5-5 --runs 2 --max-tokens 32` | `gpt-5-5` | `stream` | `1646 ms` | `1913 ms` | `1816 ms` | `2108 ms` | `-` |
| `node benchmark.mjs --model gpt-5-5 --runs 2 --max-tokens 32 --mode chat` | `gpt-5-5` | `chat` | `-` | `-` | `2239 ms` | `2267 ms` | `$0.00007031` |
| `python benchmark.py --model claude-haiku-4-5 --runs 2 --max-tokens 32` | `claude-haiku-4-5` | `stream` | `2403 ms` | `9618 ms` | `2463 ms` | `9718 ms` | `-` |

实际延迟取决于客户端所在网络、模型负载及 Service Mode，建议在你自己的生产服务器环境运行本脚本测量。

## 链接

- 实时服务状态：<https://status.hostlinku.com>
- USD 费用计算器：<https://github.com/dyocodes/hostlinku-cost-calculator>
- API 示例仓库：<https://github.com/dyocodes/hostlinku-api-examples>
- 文档：<https://docs.hostlinku.com/zh>

## 许可证

[MIT](LICENSE)。脚本本身不含任何密钥；运行实时测试会按实际 token 用量计费。
