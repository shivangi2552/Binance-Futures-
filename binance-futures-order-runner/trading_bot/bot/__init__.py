"""
Binance Futures Testnet (USDT-M) Trading Bot Package.
A structured, reliable, and clean implementation supporting MARKET, LIMIT, and TWAP orders.
"""

from bot.client import BinanceFuturesClient
from bot.orders import place_futures_order, execute_twap_order
from bot.validators import (
    validate_symbol,
    validate_side,
    validate_order_type,
    validate_quantity,
    validate_price
)
from bot.logging_config import setup_logging

__all__ = [
    "BinanceFuturesClient",
    "place_futures_order",
    "execute_twap_order",
    "validate_symbol",
    "validate_side",
    "validate_order_type",
    "validate_quantity",
    "validate_price",
    "setup_logging"
]
