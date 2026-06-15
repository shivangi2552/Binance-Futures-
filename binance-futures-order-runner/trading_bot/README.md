# Binance Futures Testnet (USDT-M) Trading Bot & Algorithmic Order Runner

A robust, type-safe, and dependency-lightweight Python 3 command-line application designed to compile, validate, and execute orders on the **Binance Futures Testnet (USDT-M)** platform. 

This repository leverages clean structural layers separating CLI controls, validation engines, and query signature managers. It includes direct REST API execution alongside an **Algorithmic TWAP execution strategy** as an advanced bonus.

---

## 🌟 Key Features
- **Direct Crypto Testnet Integrations**: Place **MARKET** and **LIMIT** orders on the official Binance Futures Testnet with both **BUY** and **SELL** support.
- **TWAP Execution Strategy (Bonus)**: Break larger, high-slippage orders into smaller slices executed systematically over time intervals to conform to average market pricing.
- **Rigorously Tested Validation**: Custom pre-execution checkers validate symbol formatting (regular expressions), side parameters, numeric limits, and dependencies.
- **HMAC-SHA256 Signed Requests**: Manual signature assembly with automated local and server clock drift synchronization to avoid Binance's strict clock-skew failures (`-1021: Timestamp for this request is outside of the recvWindow`).
- **Rotating File & Console Logging**: Centralized log dispatcher recording exact timestamps, request metadata (sensitive keys masked), API response status codes, and error tracebacks to `trading_bot.log`.

---

## 📂 Project Architecture

```text
trading_bot/
  ├── bot/
  │    ├── __init__.py         # Public library interface exports
  │    ├── client.py           # Core REST Client and HMAC-SHA256 signature generator
  │    ├── orders.py           # Standard Order placement & TWAP execution algorithms
  │    ├── validators.py       # Regex and float boundary compliance checkers
  │    └── logging_config.py   # Dual-writer rotating file and terminal logger setup
  ├── cli.py                   # High-polish argparse command-line entrypoint
  ├── requirements.txt         # Minimalist library dependencies list
  └── README.md                # Execution manual and setup documentation
```

---

## 🛠️ Installation & Setup

### 1. Register for Binance Futures Testnet
1. Visit the [Binance Futures Testnet Web Console](https://testnet.binancefuture.com).
2. Log in with your credentials or create a testnet-specific account.
3. Click on the **API Key** tab in your dashboard profile options to generate custom API Credentials.
4. Record your **API Key** and **Secret Key**.

### 2. Prepare Local Python Environment
Clone or navigate to the extracted `trading_bot` directory and execute:

```bash
# Create a localized clean Python Virtual Environment
python3 -m venv venv

# Bind and activate the environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install the dependencies
pip install -r requirements.txt
```

---

## 🚀 Execution & Command-Line Examples

Make sure to export your credentials as environment variables so you do not expose your credentials in clear shell console history records:

```bash
# Export variables on Mac/Linux:
export BINANCE_API_KEY="your_api_key_goes_here"
export BINANCE_API_SECRET="your_secret_key_goes_here"

# Or on Windows CMD:
set BINANCE_API_KEY=your_api_key_goes_here
set BINANCE_API_SECRET=your_secret_key_goes_here

# Or Windows PowerShell:
$env:BINANCE_API_KEY="your_api_key_goes_here"
$env:BINANCE_API_SECRET="your_secret_key_goes_here"
```

*Note: You can alternatively supply credentials directly using `--api-key` and `--api-secret` arguments.*

### 1. Placing a MARKET Order (BUY)
Sells or buys contract sizes immediately at current market best-offer tickers. Here, we buy `0.01` BTCUSDT contracts:

```bash
python cli.py -s BTCUSDT --side BUY -t MARKET -q 0.01
```

### 2. Placing a LIMIT Order (SELL)
Submits a maker contract order to the order book waitlist at a strictly locked entry. Requires `--price` (`-p`):

```bash
python cli.py -s BTCUSDT --side SELL -t LIMIT -q 0.01 -p 68500.0
```

### 3. Placing an Algorithmic TWAP Order (BUY - Bonus)
Splits an aggregate task quantity of `0.03` BTCUSDT contracts into `3` discrete slices of `0.01` size, executing as individual MARKET buys at consecutive standard `5` second intervals:

```bash
python cli.py -s BTCUSDT --side BUY -t TWAP -q 0.03 --slices 3 --interval 5
```

---

## 📝 Logging Operations

The system automatically generates a rotating log file named `trading_bot.log` in the running workspace directory.
- Debug outputs log granular request signatures and clocks.
- Info outputs log structured request headers and order IDs.
- Errors capture network timeouts or Binance error responses (e.g., trying to trade with insufficient margin).

### Log Formatting Pattern:
```text
YYYY-MM-DD HH:MM:SS,UTC [LEVEL] LoggerName - Description of action/payload
```
