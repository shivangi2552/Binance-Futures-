import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logging(log_file="trading_bot.log", level=logging.INFO):
    """
    Configures logging to both a rotating file and the console.
    """
    # Ensure logs directory or path is clean
    log_formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s - %(message)s'
    )
    
    # Root logger setup
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Clear any existing handlers to prevent duplicate logging
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    # File Handler (rotating log file to keep disk space usage bounded)
    try:
        file_handler = RotatingFileHandler(
            log_file, 
            maxBytes=5 * 1024 * 1024,  # 5 MB
            backupCount=3,
            encoding='utf-8'
        )
        file_handler.setFormatter(log_formatter)
        file_handler.setLevel(level)
        root_logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not configure file logging: {e}")
        
    # Console Handler for real-time CLI feedback
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    console_handler.setLevel(level)
    root_logger.addHandler(console_handler)
    
    # Return a named logger
    logger = logging.getLogger("trading_bot")
    logger.info("Logging successfully initialized. Writing to %s", log_file)
    return logger
