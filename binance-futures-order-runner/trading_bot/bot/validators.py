import re
from typing import Optional

def validate_symbol(symbol: str) -> str:
    """
    Validates that the symbol is a non-empty, uppercase alphanumeric string.
    Expected format is e.g. BTCUSDT, ETHUSDT.
    """
    if not symbol or not isinstance(symbol, str):
        raise ValueError("Symbol must be a non-empty string.")
    
    clean_symbol = symbol.strip().upper()
    # Simple regex to check Binance futures symbol standards (alphanumeric, 3-20 chars)
    if not re.match(r"^[A-Z0-9]{3,20}$", clean_symbol):
        raise ValueError(
            f"Invalid symbol format: '{symbol}'. Must look like 'BTCUSDT' or 'ETHUSDT'."
        )
    return clean_symbol


def validate_side(side: str) -> str:
    """
    Validates that the execution side is either BUY or SELL.
    """
    if not side or not isinstance(side, str):
        raise ValueError("Side must be a string ('BUY' or 'SELL').")
    
    clean_side = side.strip().upper()
    if clean_side not in ("BUY", "SELL"):
        raise ValueError(f"Invalid side: '{side}'. Must be either 'BUY' or 'SELL'.")
    return clean_side


def validate_order_type(order_type: str) -> str:
    """
    Validates that the order type is one of the supported types: MARKET, LIMIT, or TWAP.
    """
    if not order_type or not isinstance(order_type, str):
        raise ValueError("Order type must be a string.")
    
    clean_type = order_type.strip().upper()
    supported_types = ("MARKET", "LIMIT", "TWAP")
    if clean_type not in supported_types:
        raise ValueError(
            f"Invalid order type: '{order_type}'. Supported types are {', '.join(supported_types)}."
        )
    return clean_type


def validate_quantity(quantity: float) -> float:
    """
    Validates that the order quantity is a positive float or int.
    """
    try:
        val = float(quantity)
    except (ValueError, TypeError):
        raise ValueError(f"Quantity must be a valid number. Got: '{quantity}'")
    
    if val <= 0.0:
        raise ValueError(f"Quantity must be strictly greater than 0. Got: {val}")
    return val


def validate_price(price: Optional[float], order_type: str) -> Optional[float]:
    """
    Validates the price parameter. It is strictly required for LIMIT orders.
    Can be optional for MARKET orders. Must be a positive number if provided.
    """
    if order_type.upper() == "LIMIT":
        if price is None:
            raise ValueError("Price is strictly required for LIMIT orders.")
            
    if price is not None:
        try:
            val = float(price)
        except (ValueError, TypeError):
            raise ValueError(f"Price must be a valid number. Got: '{price}'")
        
        if val <= 0.0:
            raise ValueError(f"Price must be strictly positive. Got: {val}")
        return val
        
    return None
