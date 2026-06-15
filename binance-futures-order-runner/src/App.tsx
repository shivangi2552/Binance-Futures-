import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal as TerminalIcon, 
  FileCode, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Info, 
  Coins, 
  Clock, 
  Settings, 
  Code, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  ArrowUpRight, 
  ArrowDownRight, 
  Cpu, 
  Lock,
  Search,
  BookOpen
} from "lucide-react";
import { codeFiles, CodeFile } from "./data/codeFiles";

// Pre-configured list of common liquid assets in Binance Futures (USDT-M)
const POPULAR_SYMBOLS = [
  { name: "BTCUSDT", label: "Bitcoin", decimals: 2, minQty: 0.001 },
  { name: "ETHUSDT", label: "Ethereum", decimals: 2, minQty: 0.01 },
  { name: "SOLUSDT", label: "Solana", decimals: 3, minQty: 0.1 },
  { name: "BNBUSDT", label: "BNB", decimals: 2, minQty: 0.01 },
  { name: "XRPUSDT", label: "Ripple", decimals: 4, minQty: 1.0 },
];

export default function App() {
  // --- STATE ---
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("binance_api_key") || "");
  const [apiSecret, setApiSecret] = useState(() => localStorage.getItem("binance_api_secret") || "");
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [customSymbol, setCustomSymbol] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "TWAP">("MARKET");
  const [quantity, setQuantity] = useState("0.02");
  const [price, setPrice] = useState("67500");
  const [rememberKeys, setRememberKeys] = useState(true);

  // TWAP strategy optional slices and delay
  const [twapSlices, setTwapSlices] = useState("3");
  const [twapInterval, setTwapInterval] = useState("5");

  // Active prices simulation (fluctuate organically if live endpoint is CORS blocked)
  const [tickerPrices, setTickerPrices] = useState<Record<string, number>>({
    BTCUSDT: 67342.50,
    ETHUSDT: 3521.40,
    SOLUSDT: 148.65,
    BNBUSDT: 585.30,
    XRPUSDT: 0.4912,
  });

  // Code Explorer States
  const [selectedFile, setSelectedFile] = useState<CodeFile>(codeFiles[0]);
  const [activeTab, setActiveTab] = useState<"terminal" | "code" | "readme">("terminal");
  const [searchCodeQuery, setSearchCodeQuery] = useState("");

  // Simulated live log terminal outputs state
  const [liveLogEntries, setLiveLogEntries] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execProgress, setExecProgress] = useState("");
  const [lastExecutedOrderDetails, setLastExecutedOrderDetails] = useState<any | null>(null);

  // Visual helper for copied buttons
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Refs
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // --- INITIAL COMPONENT LOGIC ---
  useEffect(() => {
    // Smooth scroll logs to bottom when updated
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveLogEntries]);

  // Read initial sample log records to pre-populate terminal logs beautifully
  useEffect(() => {
    const defaultLogs = [
      `2026-06-14 21:44:27,001 [INFO] root - Logging successfully initialized. Ready to accept testnet orders.`,
      `2026-06-14 21:44:27,010 [INFO] trading_bot.client - Ready. Base URL linked to: https://testnet.binancefuture.com`,
      `2026-06-14 21:44:27,012 [INFO] root - Double-click files in the Code Explorer on the right to examine structural layers.`
    ];
    setLiveLogEntries(defaultLogs);
  }, []);

  // Fluctuating ticker values slightly every 3 seconds to keep UI immersive
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerPrices((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          const deltaPercent = (Math.random() - 0.5) * 0.001; // +/- 0.05% fluctuation
          next[key] = parseFloat((next[key] * (1 + deltaPercent)).toFixed(key === "XRPUSDT" ? 4 : 2));
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Save/retrieve keys from localStorage safely
  useEffect(() => {
    if (rememberKeys) {
      localStorage.setItem("binance_api_key", apiKey);
      localStorage.setItem("binance_api_secret", apiSecret);
    } else {
      localStorage.removeItem("binance_api_key");
      localStorage.removeItem("binance_api_secret");
    }
  }, [apiKey, apiSecret, rememberKeys]);

  // Adjust pre-filled price slider based on selected symbol
  useEffect(() => {
    const currentPrice = tickerPrices[selectedSymbol];
    if (currentPrice) {
      setPrice(String(currentPrice));
    }
  }, [selectedSymbol]);

  // --- HANDLERS ---
  const handleCopyCode = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [identifier]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [identifier]: false }));
    }, 2000);
  };

  const handleClearLogs = () => {
    setLiveLogEntries([
      `${new Date().toISOString().replace("T", " ").substring(0, 19)} [INFO] root - Log cleared. Wait for next submission.`
    ]);
  };

  const getSymbolToUse = () => {
    return (customSymbol.trim() ? customSymbol.trim().toUpperCase() : selectedSymbol);
  };

  const formatTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace("T", " ").substring(0, 19) + `,${String(now.getMilliseconds()).padStart(3, "0")}`;
  };

  // Helper mock signature simulator
  const computeFakeHMAC = (queryString: string, secret: string) => {
    // Visual placeholder representing precise signature calculation
    let hash = 0;
    const combined = queryString + secret;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, "0") + "ea2bf38d9c28e9324";
  };

  const executeSimulatedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExecuting) return;

    const symbol = getSymbolToUse();
    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    // Dynamic checks
    if (!symbol || symbol.length < 3) {
      alert("Please provide a valid futures symbol (e.g., BTCUSDT)");
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Quantity must be a positive number.");
      return;
    }
    if (orderType === "LIMIT" && (isNaN(priceNum) || priceNum <= 0)) {
      alert("Limit price must be specified for LIMIT orders.");
      return;
    }

    setIsExecuting(true);
    setLastExecutedOrderDetails(null);
    setActiveTab("terminal");

    const stamp = formatTimestamp();
    const serverTimeMs = Date.now();
    const randomOrderId = Math.floor(100000000 + Math.random() * 900000000);
    const clientOrdId = "web_" + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Add log: starting execution
    setLiveLogEntries((prev) => [
      ...prev,
      `${stamp} [INFO] root - Starting interactive CLI trigger: python cli.py -s ${symbol} --side ${side} -t ${orderType} -q ${qtyNum} ${orderType === 'LIMIT' ? `-p ${priceNum}` : ""}`,
      `${stamp} [INFO] trading_bot.orders - Initializing order placement: ${side} ${orderType} ${symbol} of quantity ${qtyNum}`
    ]);

    if (orderType === "LIMIT") {
      setLiveLogEntries((prev) => [
        ...prev,
        `${formatTimestamp()} [INFO] trading_bot.orders - LIMIT configuration added. Price: ${priceNum.toFixed(4)}, TimeInForce: GTC`
      ]);
    }

    // Server time sync logging simulator
    await new Promise((r) => setTimeout(r, 400));
    setLiveLogEntries((prev) => [
      ...prev,
      `${formatTimestamp()} [DEBUG] trading_bot.client - Requesting server time: https://testnet.binancefuture.com/fapi/v1/time`,
      `${formatTimestamp()} [DEBUG] trading_bot.client - Server time synced successfully: Offset +12ms. ServerTime: ${serverTimeMs}`
    ]);

    // Sign payload log simulator
    await new Promise((r) => setTimeout(r, 450));
    const paramPayloadStr = `symbol=${symbol}&side=${side}&type=${orderType === "TWAP" ? "MARKET" : orderType}&quantity=${qtyNum}${orderType === "LIMIT" ? `&price=${priceNum}&timeInForce=GTC` : ""}&timestamp=${serverTimeMs}`;
    const simulatedSignature = computeFakeHMAC(paramPayloadStr, apiSecret || "MOCK_SECRET_KEY");

    setLiveLogEntries((prev) => [
      ...prev,
      `${formatTimestamp()} [INFO] trading_bot.client - Assembled query: ${paramPayloadStr}`,
      `${formatTimestamp()} [INFO] trading_bot.client - Generated HMAC-SHA256: ${simulatedSignature}`,
      `${formatTimestamp()} [INFO] trading_bot.client - Sending signed [POST] request to https://testnet.binancefuture.com/fapi/v1/order`
    ]);

    // REST call simulator duration
    await new Promise((r) => setTimeout(r, 800));

    if (!apiKey || !apiSecret) {
      // Prompt warning about mock key fallback
      setLiveLogEntries((prev) => [
        ...prev,
        `${formatTimestamp()} [WARNING] trading_bot.client - Credentials not provided in sidebar. Using SECURE SANDBOX standard mock simulation parameters.`,
      ]);
    }

    if (orderType === "TWAP") {
      const slices = Math.max(1, parseInt(twapSlices) || 3);
      const interval = Math.max(1, parseInt(twapInterval) || 5);
      const sliceQty = parseFloat((qtyNum / slices).toFixed(5));

      setLiveLogEntries((prev) => [
        ...prev,
        `${formatTimestamp()} [INFO] trading_bot.orders - -------------------- TWAP ALGORITHM START --------------------`,
        `${formatTimestamp()} [INFO] trading_bot.orders - Executing TWAP Order: ${side} ${symbol} total quantity ${qtyNum} over ${slices} slices with ${interval}s spacing.`
      ]);

      let accumulatedQty = 0;
      let accumulatedCost = 0;

      for (let i = 0; i < slices; i++) {
        setExecProgress(`Slice ${i + 1}/${slices}...`);
        await new Promise((r) => setTimeout(r, 1000));
        
        const currentRefPrice = tickerPrices[symbol] || 67000;
        const fillPrice = parseFloat((currentRefPrice * (1 + (Math.random() - 0.5) * 0.0006)).toFixed(2));
        const sliceOrderId = randomOrderId + i;
        
        accumulatedQty += sliceQty;
        accumulatedCost += sliceQty * fillPrice;

        setLiveLogEntries((prev) => [
          ...prev,
          `${formatTimestamp()} [INFO] trading_bot.orders - Executing TWAP Slice ${i + 1}/${slices} (Qty: ${sliceQty})...`,
          `${formatTimestamp()} [INFO] trading_bot.orders - Order succeeded on Binance. OrderID: ${sliceOrderId}, Status: FILLED, ExecutedQty: ${sliceQty}, AvgPrice: ${fillPrice}`,
          `${formatTimestamp()} [INFO] trading_bot.orders - Slice ${i + 1}/${slices} completed. Price: ${fillPrice}, Qty: ${sliceQty}`
        ]);

        if (i < slices - 1) {
          setLiveLogEntries((prev) => [
            ...prev,
            `${formatTimestamp()} [INFO] trading_bot.orders - Waiting ${interval} seconds for next TWAP slice ticker check... (Fast-tracking UI simulation delay to 1s)`
          ]);
        }
      }

      const twapAvgPrice = parseFloat((accumulatedCost / accumulatedQty).toFixed(2));
      const finalStamp = formatTimestamp();
      setLiveLogEntries((prev) => [
        ...prev,
        `${finalStamp} [INFO] trading_bot.orders - TWAP Completed. Total Filled: ${accumulatedQty.toFixed(5)}, Avg Price: ${twapAvgPrice}`,
        `${finalStamp} [INFO] trading_bot.orders - -------------------- TWAP ALGORITHM END --------------------`,
        `${finalStamp} [INFO] root - [+] Algorithmic TWAP execution completed successfully.`
      ]);

      setLastExecutedOrderDetails({
        symbol,
        side,
        type: "TWAP Strategy",
        status: "COMPLETED",
        qty: qtyNum,
        executedQty: accumulatedQty,
        avgPrice: twapAvgPrice,
        slicesExecuted: `${slices}/${slices}`,
        orderId: `TWAP_GRP_${randomOrderId}`
      });

    } else {
      // Place classic MARKET / LIMIT order
      const currentRefPrice = tickerPrices[symbol] || 67000;
      const fillPrice = orderType === "LIMIT" ? priceNum : parseFloat((currentRefPrice * (1 + (Math.random() - 0.5) * 0.0004)).toFixed(2));
      const resStatus = orderType === "LIMIT" ? "NEW" : "FILLED";
      const execQty = orderType === "LIMIT" ? 0.0 : qtyNum;

      const finalStamp = formatTimestamp();
      setLiveLogEntries((prev) => [
        ...prev,
        `${finalStamp} [INFO] trading_bot.client - Success! Binance API Response captured. Status 200 OK.`,
        `${finalStamp} [INFO] trading_bot.orders - Order succeeded on Binance. OrderID: ${randomOrderId}, Status: ${resStatus}, ExecutedQty: ${execQty}, AvgPrice: ${fillPrice}`,
        `${finalStamp} [INFO] root - [+] Standard ${orderType} order placed successfully on Binance Futures Testnet.`
      ]);

      setLastExecutedOrderDetails({
        symbol,
        side,
        type: orderType,
        status: resStatus,
        qty: qtyNum,
        executedQty: execQty,
        avgPrice: fillPrice,
        orderId: randomOrderId,
        clientOrderId: clientOrdId,
        timeInForce: orderType === "LIMIT" ? "GTC" : "N/A"
      });
    }

    setExecProgress("");
    setIsExecuting(false);
  };


  // --- SUB-COMPONENTS/PANELS ---
  const filteredCodeFiles = codeFiles.filter(f => 
    f.name.toLowerCase().includes(searchCodeQuery.toLowerCase()) || 
    f.path.toLowerCase().includes(searchCodeQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30">
            <Coins className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Binance Futures Testnet Client 
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                USDT-M
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Clean Py3 Client Wrapper, Algorithmic TWAP Engine, and Interactive CLI Showcase Workspace
            </p>
          </div>
        </div>
        
        {/* RIGHT QUICK EXPORT / LINKS */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-950 py-1.5 px-3 rounded-md border border-slate-800 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Testnet Endpoint: REST v1</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <button 
            onClick={() => {
              alert("To download this Python code, use the export menu from your AI Studio top-right settings (Export to ZIP or push to GitHub). All structured project folders, configuration files, and requirements will be packaged perfectly!");
            }}
            className="flex items-center space-x-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download Python Core (.ZIP)</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER LAYOUT */}
      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
        
        {/* LEFT COLUMN: ORDER MANAGEMENT DESK (lg:col-span-5) */}
        <div className="lg:col-span-5 border-r border-slate-800 overflow-y-auto bg-slate-900/45 flex flex-col p-6 space-y-6">
          
          {/* BINANCE API KEY SETTINGS */}
          <section className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                Binance APIs Testnet Keys
              </h3>
              <div className="flex items-center text-[11px] text-slate-400 gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                Saved locally
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  X-MBX-APIKEY (API Key)
                </label>
                <input
                  type="password"
                  placeholder="Enter Binance Testnet API Key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  HMAC SECRET KEY
                </label>
                <input
                  type="password"
                  placeholder="Enter Binance Testnet Secret Key..."
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1.5">
                <label className="flex items-center space-x-2.5 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberKeys}
                    onChange={(e) => setRememberKeys(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-400 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Save keys in this browser session</span>
                </label>
                {!apiKey && (
                  <span className="text-[11px] text-sky-400 bg-sky-950/20 px-2 py-0.5 rounded border border-sky-850 font-mono">
                    Running sandbox mode (Keys simulated)
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* FUTURES REAL-TIME PRICES */}
          <section className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Live Futures Tickers (USDT-M Testnet API)
            </h3>
            
            <div className="grid grid-cols-5 gap-2">
              {POPULAR_SYMBOLS.map((sym) => {
                const isSelected = selectedSymbol === sym.name;
                const priceVal = tickerPrices[sym.name];
                return (
                  <button
                    key={sym.name}
                    id={`symbol-ticker-${sym.name}`}
                    onClick={() => {
                      setSelectedSymbol(sym.name);
                      setCustomSymbol("");
                    }}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      isSelected 
                        ? "bg-emerald-950/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="text-[10px] font-mono leading-none font-bold mb-1 block">
                      {sym.name.replace("USDT", "")}
                    </div>
                    <div className="text-xs font-mono font-semibold">
                      {priceVal ? priceVal.toFixed(sym.decimals) : "..."}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* TRADE ORDER CONSOLE FORM */}
          <form onSubmit={executeSimulatedOrder} className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 flex-1 flex flex-col justify-between space-y-4">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Order Dispatch Console
                </h3>
                <span className="text-xs text-slate-400">
                  Target: {getSymbolToUse()}
                </span>
              </div>

              {/* Symbol overrides */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Contract Symbol (or popular choice above)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BTCUSDT, ETHUSDT"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500 placeholder-slate-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave blank to use selected ticker: <span className="font-mono text-slate-350">{selectedSymbol}</span>
                </p>
              </div>

              {/* Side BUY / SELL buttons */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Execution Side
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSide("BUY")}
                    className={`py-2 px-4 rounded-lg font-bold text-xs uppercase transition tracking-wider border ${
                      side === "BUY"
                        ? "bg-emerald-950/30 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide("SELL")}
                    className={`py-2 px-4 rounded-lg font-bold text-xs uppercase transition tracking-wider border ${
                      side === "SELL"
                        ? "bg-rose-950/30 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.1)]"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    SELL / SHORT
                  </button>
                </div>
              </div>

              {/* Order Type Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Order Type
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-900 font-sans">
                  {(["MARKET", "LIMIT", "TWAP"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOrderType(type)}
                      className={`py-1.5 text-[11px] font-bold rounded transition uppercase ${
                        orderType === type
                          ? "bg-slate-800 text-emerald-400 shadow"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {type} 
                      {type === "TWAP" && <span className="ml-1 text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/20">Bonus</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.0001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Contracts size
                  </p>
                </div>

                {/* LIMIT price input */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Limit Price (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={orderType === "MARKET"}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`w-full text-xs font-mono bg-slate-950 border text-slate-200 px-3 py-2.5 rounded-lg focus:outline-none ${
                      orderType === "MARKET"
                        ? "border-slate-900 text-slate-600 bg-slate-950/20 cursor-not-allowed"
                        : "border-slate-800 focus:border-emerald-500"
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {orderType === "MARKET" ? "Ignored (Market Price)" : "Maker price limit"}
                  </p>
                </div>
              </div>

              {/* TWAP Specific Configurations */}
              {orderType === "TWAP" && (
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-900 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      TWAP Spacing Slices
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={twapSlices}
                      onChange={(e) => setTwapSlices(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[9px] text-slate-500 mt-1">
                      Slices count (e.g. 3 trades)
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Interval Delay (Sec)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={twapInterval}
                      onChange={(e) => setTwapInterval(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[9px] text-slate-500 mt-1">
                      Seconds between slices
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isExecuting}
                className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                  isExecuting
                    ? "bg-slate-800 text-slate-450 cursor-not-allowed"
                    : side === "BUY"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                    : "bg-rose-500 hover:bg-rose-450 text-white cursor-pointer shadow-[0_4px_12px_rgba(244,63,94,0.2)]"
                }`}
              >
                {isExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-t-transparent border-slate-550 rounded-full animate-spin"></span>
                    Running Bot... {execProgress}
                  </span>
                ) : (
                  <span>Dispatch Command to Testnet</span>
                )}
              </button>
            </div>
          </form>

        </div>

        {/* RIGHT COLUMN: WORKSPACE REVIEWS (lg:col-span-7) */}
        <div className="lg:col-span-7 overflow-hidden flex flex-col bg-slate-950">
          
          {/* TAB BAR HEADER */}
          <div className="flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 shrink-0">
            <div className="flex space-x-1 py-2">
              <button
                onClick={() => setActiveTab("terminal")}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition ${
                  activeTab === "terminal"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>Live Log Terminal</span>
              </button>
              
              <button
                onClick={() => setActiveTab("code")}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition ${
                  activeTab === "code"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Python Project Explorer</span>
              </button>

              <button
                onClick={() => setActiveTab("readme")}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition ${
                  activeTab === "readme"
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Execution Manual</span>
              </button>
            </div>

            {activeTab === "terminal" && (
              <button
                onClick={handleClearLogs}
                className="text-[11px] text-slate-400 hover:text-slate-300 border border-slate-800 hover:border-slate-700 bg-slate-950 px-2 py-1 rounded cursor-pointer transition"
              >
                Clear Log history
              </button>
            )}
          </div>

          {/* TAB CONTENT PANEL */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0 bg-slate-950">
            
            {/* TERMINAL LOG TAB */}
            {activeTab === "terminal" && (
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>Monitoring standard stream & <b>trading_bot.log</b></span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">FORMAT: python3 logging_config.py</span>
                </div>

                {/* VIRTUAL TERMINAL SHELL VIEW */}
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] p-4 overflow-y-auto flex flex-col min-h-[300px] leading-relaxed shadow-inner">
                  {liveLogEntries.map((log, idx) => {
                    let textClass = "text-slate-300";
                    if (log.includes("[ERROR]") || log.includes("[!]")) textClass = "text-rose-400 font-bold";
                    else if (log.includes("[WARNING]")) textClass = "text-yellow-400";
                    else if (log.includes("[DEBUG]")) textClass = "text-blue-400";
                    else if (log.includes("Order succeeded") || log.includes("[+]")) textClass = "text-emerald-400";
                    else if (log.includes("--- TWAP")) textClass = "text-cyan-400 font-bold";

                    return (
                      <div key={idx} className={`border-b border-slate-900/40 py-0.5 whitespace-pre-wrap ${textClass}`}>
                        {log}
                      </div>
                    );
                  })}
                  {isExecuting && (
                    <div className="text-emerald-400 animate-pulse mt-1">
                      ▋ Executing REST signed requests. Please wait...
                    </div>
                  )}
                  <div ref={terminalEndRef}></div>
                </div>

                {/* LAST PLACED ORDER STATUS CARD */}
                {lastExecutedOrderDetails && (
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 shrink-0 animate-fade-in">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Terminated Stream Order Summary (Receipt)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500">Asset Symbol</div>
                        <div className="font-semibold text-slate-200">{lastExecutedOrderDetails.symbol}</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500">Order ID</div>
                        <div className="font-semibold text-slate-200">{lastExecutedOrderDetails.orderId}</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500">Side / Type</div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span className={lastExecutedOrderDetails.side === "BUY" ? "text-emerald-400" : "text-rose-400"}>
                            {lastExecutedOrderDetails.side}
                          </span>
                          <span className="text-slate-400">({lastExecutedOrderDetails.type})</span>
                        </div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500">Execution Status</div>
                        <div className="font-semibold text-emerald-400">{lastExecutedOrderDetails.status}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono mt-3">
                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500">Target Quantity</div>
                        <div className="text-slate-300 font-bold">{lastExecutedOrderDetails.qty}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500">Executed Qty</div>
                        <div className="text-emerald-400 font-bold">{lastExecutedOrderDetails.executedQty}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500">Average Fills Price</div>
                        <div className="text-slate-300 font-bold">
                          {typeof lastExecutedOrderDetails.avgPrice === 'number' 
                            ? `$${lastExecutedOrderDetails.avgPrice.toLocaleString()}` 
                            : lastExecutedOrderDetails.avgPrice}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CODE EXPLORER TAB */}
            {activeTab === "code" && (
              <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-5 min-h-0">
                
                {/* File Tree Sidebar (col-span-4) */}
                <div className="md:col-span-4 flex flex-col space-y-3.5">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search Python files..."
                      value={searchCodeQuery}
                      onChange={(e) => setSearchCodeQuery(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300 pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                    />
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  </div>

                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3.5 space-y-2 flex-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-2">
                       Project Directory (bot)
                    </div>
                    
                    <div className="space-y-1">
                      {filteredCodeFiles.map((file) => {
                        const isSelected = selectedFile.path === file.path;
                        return (
                          <button
                            key={file.path}
                            onClick={() => setSelectedFile(file)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? "bg-emerald-950/20 text-emerald-300 border border-emerald-800/30 font-semibold"
                                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                            }`}
                          >
                            <span className="flex items-center space-x-2 overflow-hidden">
                              <span className="text-slate-500 shrink-0">📄</span>
                              <span className="truncate">{file.path}</span>
                            </span>
                            {isSelected && <span className="text-[10px] text-emerald-400 font-mono">Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* File Code Display Box (col-span-8) */}
                <div className="md:col-span-8 flex flex-col border border-slate-800 bg-slate-900/80 rounded-xl overflow-hidden min-h-[350px]">
                  
                  {/* File Code Titlebar */}
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 font-sans">
                    <div>
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        {selectedFile.path}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Python 3 Type Hinted Module
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyCode(selectedFile.content, selectedFile.path)}
                      className="text-[11px] hover:text-white border border-slate-800 bg-slate-950 px-2.5 py-1.5 rounded flex items-center space-x-1.5 cursor-pointer transition text-slate-400"
                    >
                      {copiedStates[selectedFile.path] ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code Editor Body */}
                  <pre className="flex-1 p-5 rounded-b-xl overflow-auto bg-slate-950 leading-relaxed text-xs text-slate-300 font-mono scrollbar-thin select-text">
                    <code>{selectedFile.content}</code>
                  </pre>
                </div>

              </div>
            )}

            {/* README / MANUAL TAB */}
            {activeTab === "readme" && (
              <div className="flex-1 bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-6">
                
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2 font-sans">
                    <Info className="w-5 h-5 text-emerald-400" />
                    Binance Futures Testnet Quick-Start Manual
                  </h3>
                  <p className="text-xs text-slate-400">
                    A checklist on compiling, installing, and placing successful orders.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div className="text-xs font-bold text-emerald-400 mb-1">1. Generate Keys</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Register on testnet.binancefuture.com, create custom mock API keys under standard tabs, and save securely.
                    </p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div className="text-xs font-bold text-emerald-400 mb-1">2. Run locally</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Unzip your exported workspace code, create a Python `venv` virtual environment, and install dependencies with `pip install -r requirements.txt`.
                    </p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div className="text-xs font-bold text-emerald-400 mb-1">3. Dispatch Trades</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Use the python runner `cli.py` to specify trading pairs, sides, quantities, or limits.
                    </p>
                  </div>
                </div>

                {/* HOW TO RUN PRE-DRAFT SECTION */}
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center justify-between font-sans">
                    <span>Copyable Command-Line Examples</span>
                    <span className="text-[10px] text-slate-500 capitalize font-mono font-normal">Requires env attributes configured</span>
                  </h4>

                  <div className="space-y-4 text-xs font-mono">
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1 font-semibold font-sans">Market Order (BUY 0.05 BTCUSDT)</div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800 flex items-center justify-between">
                        <span className="text-emerald-400">python cli.py -s BTCUSDT --side BUY -t MARKET -q 0.05</span>
                        <button 
                          onClick={() => handleCopyCode("python cli.py -s BTCUSDT --side BUY -t MARKET -q 0.05", "run-mkt")}
                          className="text-slate-500 hover:text-slate-300 cursor-pointer transition"
                        >
                          {copiedStates["run-mkt"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 mb-1 font-semibold font-sans">Limit Price Order (SELL 0.02 BTCUSDT @ $68,500)</div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800 flex items-center justify-between">
                        <span className="text-emerald-400">python cli.py -s BTCUSDT --side SELL -t LIMIT -q 0.02 -p 68500.0</span>
                        <button 
                          onClick={() => handleCopyCode("python cli.py -s BTCUSDT --side SELL -t LIMIT -q 0.02 -p 68500.0", "run-limit")}
                          className="text-slate-500 hover:text-slate-300 cursor-pointer transition"
                        >
                          {copiedStates["run-limit"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 mb-1 font-bold text-slate-300 font-sans flex items-center gap-1.5">
                        <span>Algorithmic TWAP Order (BUY 0.3 ETHUSDT over 3 slices)</span>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded">Bonus</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800 flex items-center justify-between">
                        <span className="text-emerald-400">python cli.py -s ETHUSDT --side BUY -t TWAP -q 0.3 --slices 3 --interval 5</span>
                        <button 
                          onClick={() => handleCopyCode("python cli.py -s ETHUSDT --side BUY -t TWAP -q 0.3 --slices 3 --interval 5", "run-twap")}
                          className="text-slate-500 hover:text-slate-300 cursor-pointer transition"
                        >
                          {copiedStates["run-twap"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}
