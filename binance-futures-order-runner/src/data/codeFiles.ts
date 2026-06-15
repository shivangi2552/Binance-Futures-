export interface CodeFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

export const codeFiles: CodeFile[] = [
  {
    name: "client.py",
    path: "bot/client.py",
    language: "python",
    content: `import hmac
import hashlib
import time
import urllib.parse
from typing import Dict, Any, Optional
import requests
import logging

class BinanceFuturesClient:
    """
    A robust, low-dependency REST client for the Binance Futures Testnet (USDT-M).
    Handles authentication, query signing, and structured exception translation.
    """
    
    BASE_URL = "https://testnet.binancefuture.com"
    
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/x-www-form-urlencoded",
            "X-MBX-APIKEY": self.api_key
        })
        self.logger = logging.getLogger("trading_bot.client")

    def _sign_payload(self, params: Dict[str, Any]) -> str:
        """
        Generates an HMAC-SHA256 signature for the given query parameters.
        RFC 2104 compliant, formatted in hexadecimal.
        """
        query_string = urllib.parse.urlencode(params)
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature

    def get_server_time(self) -> int:
        """
        Fetches the current Binance server time in milliseconds.
        """
        url = f"{self.BASE_URL}/fapi/v1/time"
        self.logger.debug("Requesting server time: %s", url)
        try:
            response = self.session.get(url, timeout=10)
            response_json = response.json()
            server_time = response_json.get("serverTime")
            if not server_time:
                raise ValueError(f"Invalid server time response: {response_json}")
            return int(server_time)
        except Exception as e:
            self.logger.error("Failed to retrieve server time: %s", e)
            return int(time.time() * 1000)

    def get_ticker_price(self, symbol: str) -> float:
        """
        Fetches the latest execution price of a symbol (public endpoint).
        """
        url = f"{self.BASE_URL}/fapi/v1/ticker/price"
        params = {"symbol": symbol.upper()}
        self.logger.debug("Fetching ticker price for symbol %s", symbol)
        try:
            response = self.session.get(url, params=params, timeout=10)
            self._handle_http_errors(response)
            data = response.json()
            return float(data.get("price", 0.0))
        except Exception as e:
            self.logger.error("Error fetching ticker price for %s: %s", symbol, e)
            raise

    def send_signed_request(self, method: str, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assembles, signs, and executes an authenticated request against Binance Futures Testnet.
        """
        url = f"{self.BASE_URL}{endpoint}"
        payload = params.copy()
        payload["timestamp"] = self.get_server_time()
        payload["signature"] = self._sign_payload(payload)
        
        self.logger.info("Sending signed [%s] request to endpoint: %s", method.upper(), endpoint)
        
        try:
            if method.upper() == "POST":
                response = self.session.post(url, data=payload, timeout=10)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, params=payload, timeout=10)
            else:
                response = self.session.get(url, params=payload, timeout=10)
                
            self._handle_http_errors(response)
            return response.json()
        except requests.exceptions.RequestException as re:
            raise RuntimeError(f"Network error communicating with Binance Testnet: {re}") from re
        except Exception as e:
            raise

    def _handle_http_errors(self, response: requests.Response) -> None:
        if response.status_code == 200:
            return
        try:
            err_data = response.json()
            binance_code = err_data.get("code", "UNKNOWN")
            binance_msg = err_data.get("msg", "No detailed message returned.")
            err_message = f"Binance API Error: Code {binance_code} - {binance_msg} (HTTP {response.status_code})"
        except Exception:
            err_message = f"HTTP Error {response.status_code}: {response.text}"
        raise ValueError(err_message)`
  },
  {
    name: "orders.py",
    path: "bot/orders.py",
    language: "python",
    content: `import time
import logging
from typing import Dict, Any, Optional
from bot.client import BinanceFuturesClient
from bot.validators import (
    validate_symbol,
    validate_side,
    validate_order_type,
    validate_quantity,
    validate_price
)

logger = logging.getLogger("trading_bot.orders")

def place_futures_order(
    client: BinanceFuturesClient,
    symbol: str,
    side: str,
    order_type: str,
    quantity: float,
    price: Optional[float] = None,
    time_in_force: str = "GTC"
) -> Dict[str, Any]:
    """
    Validates criteria and places a standard MARKET or LIMIT order on USDT-M Binance Futures.
    """
    clean_symbol = validate_symbol(symbol)
    clean_side = validate_side(side)
    clean_type = validate_order_type(order_type)
    clean_quantity = validate_quantity(quantity)
    clean_price = validate_price(price, clean_type)
    
    logger.info("Initializing order placement: %s %s %s of quantity %s", clean_side, clean_type, clean_symbol, clean_quantity)
    
    params: Dict[str, Any] = {
        "symbol": clean_symbol,
        "side": clean_side,
        "type": clean_type,
        "quantity": clean_quantity,
    }
    
    if clean_type == "LIMIT":
        params["price"] = clean_price
        params["timeInForce"] = time_in_force
        logger.info("LIMIT configuration added. Price: %f, TimeInForce: %s", clean_price, time_in_force)
        
    try:
        response = client.send_signed_request("POST", "/fapi/v1/order", params)
        order_id = response.get("orderId", "N/A")
        status = response.get("status", "N/A")
        executed_qty = response.get("executedQty", "0")
        avg_price = response.get("avgPrice", "0.0")
        if float(avg_price) == 0.0 and response.get("price"):
            avg_price = response.get("price")
            
        logger.info("Order succeeded on Binance. OrderID: %s, Status: %s, ExecutedQty: %s, AvgPrice: %s", order_id, status, executed_qty, avg_price)
        return response
    except Exception as e:
        logger.error("Order placement failed: %s", e)
        raise

def execute_twap_order(
    client: BinanceFuturesClient,
    symbol: str,
    side: str,
    total_quantity: float,
    slices: int = 3,
    interval_seconds: int = 5
) -> Dict[str, Any]:
    """
    Time-Weighted Average Price (TWAP) algorithmic order strategy.
    """
    logger.info("-------------------- TWAP ALGORITHM START --------------------")
    logger.info("Executing TWAP Order: %s %s total %f over %d slices with %ds spacing.", side, symbol, total_quantity, slices, interval_seconds)
    
    slice_qty = round(total_quantity / slices, 6)
    orders_placed = []
    accumulated_qty = 0.0
    accumulated_cost = 0.0
    
    for i in range(slices):
        logger.info("Executing TWAP Slice %d/%d (Qty: %f)...", i + 1, slices, slice_qty)
        try:
            res = place_futures_order(client, symbol, side, "MARKET", slice_qty)
            orders_placed.append(res)
            
            exec_qty = float(res.get("executedQty", slice_qty))
            avg_p = float(res.get("avgPrice") or res.get("price") or client.get_ticker_price(symbol))
            accumulated_qty += exec_qty
            accumulated_cost += exec_qty * avg_p
            
            logger.info("Slice %d completed. Price: %f", i + 1, avg_p)
        except Exception as err:
            logger.error("Slice %d failed: %s", i + 1, err)
            
        if i < slices - 1:
            time.sleep(interval_seconds)
            
    final_avg_price = (accumulated_cost / accumulated_qty) if accumulated_qty > 0 else 0.0
    logger.info("TWAP Completed. Total Filled: %f, Avg Price: %f", accumulated_qty, final_avg_price)
    logger.info("-------------------- TWAP ALGORITHM END --------------------")
    
    return {
        "symbol": symbol,
        "side": side,
        "total_attempted_qty": total_quantity,
        "total_executed_qty": accumulated_qty,
        "average_filled_price": final_avg_price,
        "total_slices": slices,
        "executed_slices": len(orders_placed)
    }`
  },
  {
    name: "validators.py",
    path: "bot/validators.py",
    language: "python",
    content: `import re
from typing import Optional

def validate_symbol(symbol: str) -> str:
    if not symbol or not isinstance(symbol, str):
        raise ValueError("Symbol must be a non-empty string.")
    clean_symbol = symbol.strip().upper()
    if not re.match(r"^[A-Z0-9]{3,20}$", clean_symbol):
        raise ValueError(f"Invalid symbol format: '{symbol}'")
    return clean_symbol

def validate_side(side: str) -> str:
    if not side or not isinstance(side, str):
        raise ValueError("Side must be a string")
    clean_side = side.strip().upper()
    if clean_side not in ("BUY", "SELL"):
        raise ValueError(f"Invalid side: '{side}'")
    return clean_side

def validate_order_type(order_type: str) -> str:
    clean_type = order_type.strip().upper()
    if clean_type not in ("MARKET", "LIMIT", "TWAP"):
        raise ValueError(f"Invalid order type: '{order_type}'")
    return clean_type

def validate_quantity(quantity: float) -> float:
    try:
        val = float(quantity)
    except (ValueError, TypeError):
        raise ValueError(f"Quantity must be a valid number. Got: '{quantity}'")
    if val <= 0.0:
        raise ValueError(f"Quantity must be greater than 0. Got: {val}")
    return val

def validate_price(price: Optional[float], order_type: str) -> Optional[float]:
    if order_type.upper() == "LIMIT":
        if price is None:
            raise ValueError("Price is required for LIMIT orders.")
    if price is not None:
        try:
            val = float(price)
        except (ValueError, TypeError):
            raise ValueError(f"Price must be a valid number.")
        if val <= 0.0:
            raise ValueError(f"Price must be strictly positive.")
        return val
    return None`
  },
  {
    name: "logging_config.py",
    path: "bot/logging_config.py",
    language: "python",
    content: `import logging
from logging.handlers import RotatingFileHandler

def setup_logging(log_file="trading_bot.log", level=logging.INFO):
    log_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s - %(message)s')
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    try:
        file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
        file_handler.setFormatter(log_formatter)
        file_handler.setLevel(level)
        root_logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: File logging error: {e}")
        
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(level)
    root_logger.addHandler(console_handler)
    
    return logging.getLogger("trading_bot")`
  },
  {
    name: "cli.py",
    path: "cli.py",
    language: "python",
    content: `#!/usr/bin/env python3
import os
import sys
import argparse
from bot.logging_config import setup_logging
from bot.client import BinanceFuturesClient
from bot.orders import place_futures_order, execute_twap_order

def main():
    print("=" * 60)
    print("      BINANCE FUTURES TESTNET (USDT-M) ORDER RUNNER      ")
    print("=" * 60)
    
    logger = setup_logging()
    parser = argparse.ArgumentParser(description="Place orders on Binance Futures Testnet.")
    
    parser.add_argument("--api-key", default=os.getenv("BINANCE_API_KEY"))
    parser.add_argument("--api-secret", default=os.getenv("BINANCE_API_SECRET"))
    parser.add_argument("--symbol", "-s", required=True, help="BTCUSDT, etc.")
    parser.add_argument("--side", choices=["BUY", "SELL"], required=True)
    parser.add_argument("--type", "-t", choices=["MARKET", "LIMIT", "TWAP"], required=True)
    parser.add_argument("--quantity", "-q", type=float, required=True)
    parser.add_argument("--price", "-p", type=float)
    parser.add_argument("--slices", type=int, default=3)
    parser.add_argument("--interval", type=int, default=5)

    args = parser.parse_args()
    
    api_key = args.api_key
    api_secret = args.api_secret
    if not api_key or not api_secret:
        print("[!] ERROR: API credentials missing.")
        sys.exit(1)

    try:
        client = BinanceFuturesClient(api_key, api_secret)
        if args.type == "TWAP":
            print("[*] Starting TWAP strategy...")
            res = execute_twap_order(client, args.symbol, args.side, args.quantity, args.slices, args.interval)
            print("[+] TWAP Success: Fill Avg Price", res["average_filled_price"])
        else:
            print("[*] Placing standard order...")
            res = place_futures_order(client, args.symbol, args.side, args.type, args.quantity, args.price)
            print("[+] Order Successful. ID:", res.get("orderId"))
    except Exception as e:
        print("[!] Error Executing Order:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()`
  },
  {
    name: "requirements.txt",
    path: "requirements.txt",
    language: "properties",
    content: `requests>=2.28.0`
  }
];
