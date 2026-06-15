import time
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
    # 1. Validation Step
    clean_symbol = validate_symbol(symbol)
    clean_side = validate_side(side)
    clean_type = validate_order_type(order_type)
    clean_quantity = validate_quantity(quantity)
    clean_price = validate_price(price, clean_type)
    
    logger.info(
        "Initializing order placement: %s %s %s of quantity %s",
        clean_side, clean_type, clean_symbol, clean_quantity
    )
    
    # 2. Build Binance Order Signature Parameters
    # Standard endpoint: POST /fapi/v1/order
    params: Dict[str, Any] = {
        "symbol": clean_symbol,
        "side": clean_side,
        "type": clean_type,
        "quantity": clean_quantity,
    }
    
    # Limit orders require specific logic parameters
    if clean_type == "LIMIT":
        params["price"] = clean_price
        params["timeInForce"] = time_in_force  # GTC (Good Till Cancel) is standard
        logger.info("LIMIT configuration added. Price: %f, TimeInForce: %s", clean_price, time_in_force)
        
    try:
        # 3. Call the testnet client
        response = client.send_signed_request("POST", "/fapi/v1/order", params)
        
        # 4. Extract critical details for clean visual logs
        order_id = response.get("orderId", "N/A")
        status = response.get("status", "N/A")
        executed_qty = response.get("executedQty", "0")
        avg_price = response.get("avgPrice", "0.0")
        # For LIMIT orders with partial execution, avgPrice might be 0, look at price
        if float(avg_price) == 0.0 and response.get("price"):
            avg_price = response.get("price")
            
        logger.info(
            "Order succeeded on Binance. OrderID: %s, Status: %s, ExecutedQty: %s, AvgPrice: %s",
            order_id, status, executed_qty, avg_price
        )
        return response
        
    except Exception as e:
        logger.error(
            "Order placement failed for %s %s %s: %s", 
            clean_side, clean_type, clean_symbol, e
        )
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
    BONUS FEATURE: Time-Weighted Average Price (TWAP) algorithmic order strategy.
    Divides total_quantity into defined slices and submits them as smaller MARKET orders
    spaced out dynamically over an interval.
    """
    logger.info("-------------------- TWAP ALGORITHM START --------------------")
    logger.info(
        "Executing TWAP Order: %s %s total quantity %f over %d slices with %ds spacing.",
        side, symbol, total_quantity, slices, interval_seconds
    )
    
    if slices < 1:
        raise ValueError("TWAP slices count must be at least 1.")
    if interval_seconds < 1:
        raise ValueError("TWAP slice interval must be at least 1 second.")
        
    slice_qty = round(total_quantity / slices, 6)
    if slice_qty <= 0.0:
        raise ValueError(
            f"Quantity per slice ({slice_qty}) is too small. Please increase quantity or reduce slices."
        )
        
    orders_placed = []
    accumulated_qty = 0.0
    accumulated_cost = 0.0
    
    for i in range(slices):
        logger.info("Executing TWAP Slice %d/%d (Qty: %f)...", i + 1, slices, slice_qty)
        try:
            # Place small MARKET slice
            res = place_futures_order(
                client=client,
                symbol=symbol,
                side=side,
                order_type="MARKET",
                quantity=slice_qty
            )
            orders_placed.append(res)
            
            # Record execution metrics to summarize TWAP impact
            exec_qty = float(res.get("executedQty", slice_qty))
            avg_p = float(res.get("avgPrice") or res.get("price") or client.get_ticker_price(symbol))
            
            accumulated_qty += exec_qty
            accumulated_cost += exec_qty * avg_p
            
            logger.info("Slice %d/%d completed. Price: %f, Qty: %f", i + 1, slices, avg_p, exec_qty)
            
        except Exception as slice_err:
            logger.error("Failed to execute TWAP slice %d: %s", i + 1, slice_err)
            
        if i < slices - 1:
            logger.info("Waiting %d seconds for next TWAP slice ticker check...", interval_seconds)
            time.sleep(interval_seconds)
            
    final_avg_price = (accumulated_cost / accumulated_qty) if accumulated_qty > 0 else 0.0
    
    summary = {
        "strategy": "TWAP",
        "symbol": symbol,
        "side": side,
        "total_attempted_qty": total_quantity,
        "total_executed_qty": accumulated_qty,
        "average_filled_price": final_avg_price,
        "total_slices": slices,
        "executed_slices": len(orders_placed),
        "individual_responses": orders_placed
    }
    
    logger.info("TWAP Completed. Total Filled: %f, Avg Price: %f", accumulated_qty, final_avg_price)
    logger.info("-------------------- TWAP ALGORITHM END --------------------")
    return summary
