#!/usr/bin/env python3
"""
Binance Futures Testnet CLI Order Management Interface.
Accepts user criteria, builds, signs and executes requests with detailed feedback.
"""

import os
import sys
import argparse
import logging
from bot.logging_config import setup_logging
from bot.client import BinanceFuturesClient
from bot.orders import place_futures_order, execute_twap_order

def print_banner():
    print("=" * 60)
    print("      BINANCE FUTURES TESTNET (USDT-M) ORDER RUNNER      ")
    print("=" * 60)

def print_order_summary_terminal(title: str, data: dict):
    print("\n" + "-" * 15 + f" {title} " + "-" * 15)
    for key, value in data.items():
        if isinstance(value, list):
            print(f"{key:24}: [List of {len(value)} items]")
        else:
            print(f"{key:24}: {value}")
    print("-" * (32 + len(title)) + "\n")

def main():
    print_banner()
    
    # Configure logging to write to trading_bot.log file and stdout
    logger = setup_logging()
    
    parser = argparse.ArgumentParser(
        description="Place orders on the Binance Futures (USDT-M) Testnet.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Credentials Config
    parser.add_argument(
        "--api-key", 
        default=os.getenv("BINANCE_API_KEY"),
        help="Binance Futures Testnet API Key. Can also be set via BINANCE_API_KEY env variable."
    )
    parser.add_argument(
        "--api-secret", 
        default=os.getenv("BINANCE_API_SECRET"),
        help="Binance Futures Testnet Secret Key. Can also be set via BINANCE_API_SECRET env variable."
    )
    
    # Order Parameters
    parser.add_argument("--symbol", "-s", required=True, help="Trading pair (e.g., BTCUSDT, ETHUSDT)")
    parser.add_argument("--side", choices=["BUY", "SELL"], required=True, help="Execution side (BUY or SELL)")
    parser.add_argument(
        "--type", "-t", 
        choices=["MARKET", "LIMIT", "TWAP"], 
        required=True, 
        help="Order type (MARKET, LIMIT, or TWAP strategy)"
    )
    parser.add_argument("--quantity", "-q", type=float, required=True, help="Amount to trade (e.g., 0.05)")
    parser.add_argument("--price", "-p", type=float, help="Order limit price (strictly required for LIMIT orders)")
    
    # Algorithmic TWAP Config
    parser.add_argument("--slices", type=int, default=3, help="Slices count for TWAP algorithmic execution")
    parser.add_argument("--interval", type=int, default=5, help="Interval delay (seconds) between TWAP orders")

    args = parser.parse_args()
    
    # 1. API Credentials Validation
    api_key = args.api_key
    api_secret = args.api_secret
    
    if not api_key or not api_secret:
        logger.error("Missing credentials. Please supply --api-key and --api-secret, or configure environment variables.")
        print("\n[!] CRITICAL ERROR: API Credentials Missing.")
        print("Please configure BINANCE_API_KEY and BINANCE_API_SECRET in your environment or supply them via flags.")
        print("See README.md for instructions.\n")
        sys.exit(1)

    # 2. Instantiate Client wrapper
    try:
        client = BinanceFuturesClient(api_key=api_key, api_secret=api_secret)
    except Exception as e:
        logger.critical("Failed to instantiate Binance REST Client: %s", e)
        sys.exit(1)

    # 3. Handle Executions
    try:
        if args.type == "TWAP":
            print(f"\n[*] Launching Algorithmic TWAP execution strategy...")
            twap_summary = execute_twap_order(
                client=client,
                symbol=args.symbol,
                side=args.side,
                total_quantity=args.quantity,
                slices=args.slices,
                interval_seconds=args.interval
            )
            
            # Print TWAP final report
            print_order_summary_terminal("TWAP STRATEGY REPORT", {
                "Strategy": "Time-Weighted Average Price (TWAP)",
                "Symbol/Asset": twap_summary["symbol"],
                "Side": twap_summary["side"],
                "Target Qty": twap_summary["total_attempted_qty"],
                "Executed Qty": twap_summary["total_executed_qty"],
                "Average Entry Price": twap_summary["average_filled_price"],
                "Total Slices": twap_summary["total_slices"],
                "Successful Slices": twap_summary["executed_slices"]
            })
            print("[+] Algorithmic TWAP execution completed successfully.")
            
        else:
            # Traditional Limit/Market Order
            print(f"\n[*] Processing standard {args.type} order submission...")
            response = place_futures_order(
                client=client,
                symbol=args.symbol,
                side=args.side,
                order_type=args.type,
                quantity=args.quantity,
                price=args.price
            )
            
            # Construct a clear display terminal card
            summary_dict = {
                "Symbol / Asset": response.get("symbol"),
                "Order ID": response.get("orderId"),
                "Client Order ID": response.get("clientOrderId"),
                "Side": response.get("side"),
                "Order Type": response.get("type"),
                "Execution Status": response.get("status"),
                "Requested Qty": args.quantity,
                "Executed Qty": response.get("executedQty", "0.0"),
                "Avg execution Price": response.get("avgPrice") or response.get("price") or "Market Determined",
                "Time in Force": response.get("timeInForce", "N/A"),
                "UTC Transaction Time": response.get("updateTime")
            }
            
            print_order_summary_terminal(f"FUTURES {args.type} ORDER SUCCESS", summary_dict)
            print("[+] Standard order placed successfully on Binance Futures Testnet.")
            
    except ValueError as val_err:
        logger.error("Input Validation or API Logical Error: %s", val_err)
        print(f"\n[!] LOGICAL ERROR: {val_err}\n")
        sys.exit(1)
    except RuntimeError as run_err:
        logger.error("Network Communication Error during order: %s", run_err)
        print(f"\n[!] NETWORK ERROR: {run_err}\n")
        sys.exit(1)
    except Exception as general_err:
        logger.exception("Unexpected system failure: %s", general_err)
        print(f"\n[!] UNEXPECTED FAILURE: {general_err}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
