import hmac
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
        # Binance expects parameter pairs concatenated by '&' sorted or unsorted, but order-preserved.
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
        Highly recommended to synchronize clocks before making signed requests.
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
            # Fallback to local time if server is unreachable, converted to ms
            return int(time.time() * 1000)

    def get_ticker_price(self, symbol: str) -> float:
        """
        Fetches the latest execution price of a symbol (public endpoint).
        Does not require keys or signatures.
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
        
        # Inject standard timestamp required by Binance
        payload = params.copy()
        payload["timestamp"] = self.get_server_time()
        
        # Calculate HMAC signature
        payload["signature"] = self._sign_payload(payload)
        
        self.logger.info("Sending signed [%s] request to endpoint: %s", method.upper(), endpoint)
        self.logger.debug("Payload details (excluding signature/keys): %s", {k: v for k, v in payload.items() if k not in ("signature", "timestamp")})
        
        try:
            if method.upper() == "POST":
                # Binance expects form-encoded body for mutations
                response = self.session.post(url, data=payload, timeout=10)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, params=payload, timeout=10)
            else: # GET
                response = self.session.get(url, params=payload, timeout=10)
                
            self._handle_http_errors(response)
            response_data = response.json()
            self.logger.info("Success! Binance API Response captured.")
            return response_data
            
        except requests.exceptions.RequestException as re:
            self.logger.error("Network or connection failure when requesting %s: %s", endpoint, re)
            raise RuntimeError(f"Network error communicating with Binance Testnet: {re}") from re
        except Exception as e:
            self.logger.error("Unexpected error executing api request: %s", e)
            raise

    def _handle_http_errors(self, response: requests.Response) -> None:
        """
        Checks the HTTP response code and parses structured Binance error messages.
        Throws helpful exceptions.
        """
        if response.status_code == 200:
            return
            
        # Parse standard error code and message from Binance response
        try:
            err_data = response.json()
            binance_code = err_data.get("code", "UNKNOWN")
            binance_msg = err_data.get("msg", "No detailed message returned.")
            err_message = f"Binance API Error: Code {binance_code} - {binance_msg} (HTTP {response.status_code})"
        except Exception:
            err_message = f"HTTP Error {response.status_code}: {response.text}"
            
        self.logger.error("HTTP execution failed. Status: %d. Error detail: %s", response.status_code, err_message)
        raise ValueError(err_message)
