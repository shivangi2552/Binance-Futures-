# Binance Futures Testnet (USDT-M) Trading Bot & Algorithmic Order Runner

A robust, type-signed, and dependency-lightweight Python 3 CLI trading bot designed to compile, validate, and execute orders on the **Binance Futures Testnet (USDT-M)** exchange. 

This repository implements a clean multi-layer architecture separating inputs validation, raw REST networking, HMAC-SHA256 signature generation, and algorithmic execution. It is bundled with an interactive **Time-Weighted Average Price (TWAP)** strategy to dynamically slice orders and minimize market impact.

---

## 🌟 Key Features

* **USDT-M Testnet Integrations**: Place **MARKET** and **LIMIT** orders on the official Binance Futures Testnet with both **BUY** and **SELL** support.
* **Algorithmic TWAP Engine (Bonus)**: Automatically breaks larger, high-slippage orders into multiple smaller slices spaced over timed intervals.
* **Rigorous Input Validation**: Strict validation schemas for symbol naming formatting (regex checks), transaction sides, and price parameters before dispatching network requests.
* **Clock Sync & Signed Requests**: Manual HMAC-SHA256 query assembly with automated server time synchronization to counteract Binance's strict clock-skew protections (`-1021: Timestamp for this request is outside of the recvWindow`).
* **Rotating Logs Handler**: Detailed timestamped execution records of requests and structural API responses captured to physical file (`trading_bot.log`) and mirrored to terminal stream.

---

## 📂 Project Architecture

```text
trading_bot/
  ├── bot/
  │    ├── __init__.py         # Public package exports
  │    ├── client.py           # Core REST Client and HMAC-SHA256 signature generator
  │    ├── orders.py           # Standard Order placement & TWAP execution algorithms
  │    ├── validators.py       # Input boundaries and regex compliance checkers
  │    └── logging_config.py   # Dual-writer rotating file and terminal log managers
  ├── cli.py                   # High-polish argparse command-line entrypoint
  ├── requirements.txt         # Package dependencies (pure requests utility)
  └── README.md                # Documentation and setup instructions
