"use client";

import React, { useEffect, useMemo, useState } from "react";
import UserOnboarding from "./UserOnboarding";

// Simple toast notification component
function Toast({ message, show, onClose }: { message: string; show: boolean; onClose: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in-up">
      <div className="bg-blue-500/90 backdrop-blur-sm border border-blue-400/30 rounded-lg px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="text-blue-400">🚀</div>
          <div className="text-white font-medium">{message}</div>
          <button
            onClick={onClose}
            className="text-blue-300 hover:text-white transition-colors ml-2"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

type Subscriber = {
  username: string;
  sent: boolean;
};

type ExecutionData = {
  safeAddress: string;
  username: string;
  executedAt: Date;
  tradeData: {
    signalMessage: string;
    tokenMentioned: string;
    tp1: number;
    tp2: number;
    stopLoss: number;
    currentPrice: number;
    maxExitTime: Date;
  };
};

type SignalData = {
  token?: string;
  signal?: string; // Buy | Sell | ...
  currentPrice?: number;
  targets?: number[];
  stopLoss?: number;
  timeline?: string;
  maxExitTime?: string | Date;
  tradeTip?: string;
  tweet_id?: string | number;
  tweet_link?: string;
  tweet_timestamp?: string;
  priceAtTweet?: number;
  twitterHandle?: string;
  tokenMentioned?: string;
  tokenId?: string;
};

export type Signal = {
  _id: string;
  tweet_id?: string | number;
  twitterHandle?: string;
  coin?: string;
  signal_message?: string;
  signal_data?: SignalData;
  generatedAt?: string | Date;
  subscribers?: Subscriber[];
  tweet_link?: string;
  messageSent?: boolean;
  executedBy?: ExecutionData[];
  lastExecutedAt?: string | Date;
  isExecuted?: boolean;
};

type ApiResponse = {
  success: boolean;
  data?: unknown[];
  error?: string;
  message?: string;
};

function unwrapExtendedJson<T = unknown>(value: any): T {
  if (value == null) return value as T;

  if (typeof value === "object" && "$numberLong" in value) {
    const num = Number((value as any)["$numberLong"]);
    return (Number.isNaN(num) ? (value as any)["$numberLong"] : num) as unknown as T;
  }

  if (typeof value === "object" && "$date" in value) {
    return value["$date"] as string as unknown as T;
  }

  if (typeof value === "object" && value?._bsontype === "ObjectID" && typeof value.toHexString === "function") {
    return value.toHexString() as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((v) => unwrapExtendedJson(v)) as unknown as T;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = unwrapExtendedJson(v);
    }
    return out as T;
  }

  return value as T;
}

function normalizeSignal(raw: any): Signal {
  const unwrapped = unwrapExtendedJson<Record<string, any>>(raw) || {};
  return {
    _id: String(unwrapped._id ?? ""),
    tweet_id: unwrapped.tweet_id,
    twitterHandle: unwrapped.twitterHandle,
    coin: unwrapped.coin,
    signal_message: unwrapped.signal_message,
    signal_data: unwrapped.signal_data,
    generatedAt: unwrapped.generatedAt,
    subscribers: Array.isArray(unwrapped.subscribers) ? unwrapped.subscribers : [],
    tweet_link: unwrapped.tweet_link,
    messageSent: Boolean(unwrapped.messageSent),
    executedBy: Array.isArray(unwrapped.executedBy) ? unwrapped.executedBy : [],
    lastExecutedAt: unwrapped.lastExecutedAt,
    isExecuted: Boolean(unwrapped.isExecuted),
  };
}

function formatCurrency(value?: number, currency = "USD"): string {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

function calculatePnL(currentPrice?: number, entryPrice?: number, signal?: string): { percentage: number; absolute: number; isProfit: boolean } {
  if (!currentPrice || !entryPrice || !signal) {
    return { percentage: 0, absolute: 0, isProfit: false };
  }

  const isBuy = signal.toLowerCase() === 'buy';
  const multiplier = isBuy ? 1 : -1;
  const absolute = (currentPrice - entryPrice) * multiplier;
  const percentage = (absolute / entryPrice) * 100;
  const isProfit = absolute > 0;

  return { percentage, absolute, isProfit };
}

function classNames(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function SignalCard({ signal, index, onTradeClick, userSafeAddress, isExecuting }: { signal: Signal; index: number; onTradeClick: (signal: Signal) => Promise<void>; userSafeAddress: string | null; isExecuting: boolean }) {
  const sd = signal.signal_data || {};
  const signalType = (sd.signal || "").toLowerCase();
  const isBuy = signalType === "buy";
  const isSell = signalType === "sell";

  // Check if this signal is already executed by the current user
  const isExecutedByUser = useMemo(() => {
    if (!userSafeAddress || !signal.executedBy) return false;
    return signal.executedBy.some(execution => execution.safeAddress === userSafeAddress);
  }, [signal.executedBy, userSafeAddress]);

  // Check if signal has any executions (from any user) - for display purposes only
  const hasExecutions = signal.isExecuted || (signal.executedBy && signal.executedBy.length > 0);

  const pnl = useMemo(() =>
    calculatePnL(sd.currentPrice, sd.priceAtTweet, sd.signal),
    [sd.currentPrice, sd.priceAtTweet, sd.signal]
  );

  const timeAgo = useMemo(() => {
    const d = typeof signal.generatedAt === "string" ? new Date(signal.generatedAt) : (signal.generatedAt as Date | undefined);
    if (!d) return "-";

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "< 1h ago";
  }, [signal.generatedAt]);

  return (
    <div
      className="signal-card animate-fade-in-up max-w-2xl mx-auto"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="p-4">
        {/* Cleaner Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-white">
              {sd.token || signal.coin || "Unknown"}
            </h3>
            {sd.signal && (
              <span className={classNames(
                "px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                isBuy ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                  isSell ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    "bg-gray-500/20 text-gray-400 border border-gray-500/30"
              )}>
                {sd.signal}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className={classNames(
              "text-sm font-bold",
              pnl.isProfit ? "text-green-400" : "text-red-400"
            )}>
              {pnl.percentage > 0 ? "+" : ""}{pnl.percentage.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-400">{timeAgo}</div>
          </div>
        </div>

        {/* Compact Metrics */}
        <div className="space-y-2 mb-4">
          {/* Current and Stop Loss side by side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
              <div className="text-xs text-gray-400 mb-1">Current</div>
              <div className="text-sm font-bold text-white">
                {formatCurrency(sd.currentPrice)}
              </div>
            </div>

            <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/30">
              <div className="text-xs text-red-400 mb-1">Stop Loss</div>
              <div className="text-sm font-bold text-white">
                {formatCurrency(sd.stopLoss)}
              </div>
            </div>
          </div>

          {/* Timeline full width */}
          <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/30">
            <div className="text-xs text-blue-400 mb-1">Timeline</div>
            <div className="text-xs font-bold text-white">
              {sd.timeline || "N/A"}
            </div>
          </div>
        </div>

        {/* Compact Targets */}
        {(sd.targets || []).length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-2 font-semibold">Targets</div>
            <div className="flex flex-wrap gap-1.5">
              {sd.targets!.map((target, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-1 text-xs font-semibold"
                >
                  TP{i + 1}: {formatCurrency(target)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Trade Tip */}
        {sd.tradeTip && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
            <div className="text-xs text-blue-400 font-semibold mb-1">Trade Tip</div>
            <div className="text-xs text-gray-300">{sd.tradeTip}</div>
          </div>
        )}

        {/* Trade Button - Only show for Buy signals */}
        {isBuy && (
          <div className="mt-4 pt-3 border-t border-gray-700/50">
            {isExecutedByUser ? (
              <div className="w-full bg-green-500/20 border border-green-500/30 text-green-400 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2">
                <span>✅</span>
                <span>Trade Executed by You</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Show execution count from others if any */}
                {hasExecutions && (
                  <div className="w-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm">
                    <span>👥</span>
                    <span>Executed by Others ({signal.executedBy?.length || 0})</span>
                  </div>
                )}
                {/* Execute Trade Button - always available if user hasn't executed */}
                <button
                  onClick={() => onTradeClick(signal)}
                  disabled={isExecuting}
                  className={classNames(
                    "w-full font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                    isExecuting
                      ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                      : "bg-green-800 hover:bg-green-700 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
                  )}
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-transparent"></div>
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Execute Trade</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignalsFeed() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [userSafeAddress, setUserSafeAddress] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [executingTrades, setExecutingTrades] = useState<Set<string>>(new Set());

  const handleTradeClick = async (signal: Signal) => {
    if (!userSafeAddress) {
      console.error("No safe address available");
      return;
    }

    // Add signal ID to executing trades set
    setExecutingTrades(prev => new Set(prev).add(signal._id));

    // Prepare the trade data object
    console.log("signal_data: ", signal.signal_data);
    console.log("signal_message: ", signal.signal_message);
    const tradeData = {
      tweetId: signal.tweet_id,
      "Signal Message": signal.signal_data?.signal || "",
      "Token Mentioned": signal.signal_data?.tokenMentioned || "Unknown",
      "TP1": signal.signal_data?.targets?.[0] || 0,
      "TP2": signal.signal_data?.targets?.[1] || 0,
      "SL": signal.signal_data?.stopLoss || 0,
      "Current Price": signal.signal_data?.currentPrice || 0,
      "Max Exit Time": { "date": signal.signal_data?.maxExitTime || new Date().toISOString() },
      "username": userUsername || "",
      "safeAddress": userSafeAddress
    };

    try {
      const response = await fetch("/api/execute-trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tradeData),
      });

      const result = await response.json();

      if (result.success) {
        setShowToast(true);
        console.log("Trade executed successfully: ", result);
        // Refresh signals to show updated execution status
        await loadSignals();
      } else {
        console.error("Error executing trade:", result.message);
        // You might want to show an error toast here
      }
    } catch (e) {
      console.error("Error executing trade:", e);
    } finally {
      // Remove signal ID from executing trades set
      setExecutingTrades(prev => {
        const newSet = new Set(prev);
        newSet.delete(signal._id);
        return newSet;
      });
    }
  };

  const handleOnboardingComplete = (safeAddress: string, username: string) => {
    setUserSafeAddress(safeAddress);
    setUserUsername(username);
    setShowOnboarding(false);
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem("user_safe_address");
    localStorage.removeItem("user_username");
    setUserSafeAddress(null);
    setUserUsername(null);
    setShowOnboarding(true);
  };

  // Check for existing safe address and username on mount
  useEffect(() => {
    const existingAddress = localStorage.getItem("user_safe_address");
    const existingUsername = localStorage.getItem("user_username");
    if (existingAddress && existingUsername) {
      setUserSafeAddress(existingAddress);
      setUserUsername(existingUsername);
      setShowOnboarding(false);
    }
  }, []);

  const loadSignals = async () => {
    // setLoading(true);
    try {
      const res = await fetch("/api/signals", { cache: "no-store" });
      const json: ApiResponse = await res.json();
      if (!json.success) {
        throw new Error(json.message || json.error || "Failed to load signals");
      }
      const normalized = (json.data || []).map((r) => normalizeSignal(r));

      console.log("normalize: ", normalized)
      setSignals(normalized as Signal[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load signals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      await loadSignals();
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Show onboarding if user hasn't completed it yet
  if (showOnboarding) {
    return <UserOnboarding onComplete={handleOnboardingComplete} />;
  }

  if (loading) {
    return (
      <div className="space-y-3 max-w-2xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="signal-card animate-pulse"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="h-5 w-24 bg-gray-700 rounded" />
                <div className="h-4 w-16 bg-gray-700 rounded" />
              </div>
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-gray-700 rounded-lg" />
                  <div className="h-12 bg-gray-700 rounded-lg" />
                </div>
                <div className="h-10 bg-gray-700 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-700 rounded" />
                <div className="h-6 w-20 bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="signal-card border-red-500/50 bg-red-500/5 animate-fade-in-up max-w-2xl mx-auto">
        <div className="p-6 text-center">
          <div className="text-red-400 text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Error Loading Signals</h3>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <div className="signal-card animate-fade-in-up max-w-2xl mx-auto">
        <div className="p-6 text-center">
          <div className="text-gray-400 text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Signals Available</h3>
          <p className="text-gray-300">Check back later for new trading signals</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast
        message={`Trade executed successfully 🚀`}
        show={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Safe Address and Username Display */}
      <div className="max-w-2xl mx-auto px-4 mb-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400">🔐</span>
              <span className="text-sm text-gray-300">Safe Address:</span>
              <span className="text-sm font-mono text-white">
                {userSafeAddress?.slice(0, 6)}...{userSafeAddress?.slice(-4)}
              </span>
            </div>
            <button
              onClick={handleResetOnboarding}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Change
            </button>
          </div>
          {/* {userUsername && (
            <div className="flex items-center gap-2">
              <span className="text-blue-400">👤</span>
              <span className="text-sm text-gray-300">Username:</span>
              <span className="text-sm font-semibold text-white">{userUsername}</span>
            </div>
          )} */}
        </div>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto px-4">
        {signals.map((sig, index) => (
          <SignalCard
            key={sig._id}
            signal={sig}
            index={index}
            onTradeClick={handleTradeClick}
            userSafeAddress={userSafeAddress}
            isExecuting={executingTrades.has(sig._id)}
          />
        ))}
      </div>
    </>
  );
}