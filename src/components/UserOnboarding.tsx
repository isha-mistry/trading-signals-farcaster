"use client";

import React, { useState } from "react";

interface UserOnboardingProps {
  onComplete: (safeAddress: string, username: string) => void;
}

export default function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const [safeAddress, setSafeAddress] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const validateAddress = (address: string): boolean => {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!safeAddress.trim()) {
      setError("Please enter a safe wallet address");
      return;
    }

    if (!validateAddress(safeAddress)) {
      setError("Please enter a valid Ethereum address (0x followed by 40 hex characters)");
      return;
    }

    setIsValidating(true);

    try {
      // Fetch username from the safe-deployment-service database
      const response = await fetch("/api/safe-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ safeAddress: safeAddress.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.error === "Safe address not found in arbitrum deployments") {
          setError("Safe address not found. Please ensure this address is deployed on Arbitrum network.");
        } else if (result.error === "Username not found for this safe address") {
          setError("Username not found for this safe address. Please contact support.");
        } else {
          setError(result.error || "Failed to validate safe address");
        }
        return;
      }

      const { username } = result.data;

      // Store both safe address and username in localStorage for persistence
      localStorage.setItem("user_safe_address", safeAddress);
      localStorage.setItem("user_username", username);

      // Call the completion callback with both safe address and username
      onComplete(safeAddress, username);
    } catch (err) {
      console.error("Error during validation:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="signal-card animate-fade-in-up max-w-2xl mx-auto">
      <div className="p-6 text-center">
        <div className="text-blue-400 text-4xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-white mb-3">Welcome to ArbMaxx</h2>
        <p className="text-gray-300 mb-6">
          To access trading signals, please provide your Safe wallet address for verification.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label htmlFor="safeAddress" className="block text-sm font-medium text-gray-300 mb-2">
              Safe Wallet Address
            </label>
            <input
              id="safeAddress"
              type="text"
              value={safeAddress}
              onChange={(e) => setSafeAddress(e.target.value)}
              placeholder="0x1F...506a"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              disabled={isValidating}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating || !safeAddress.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <div className="spinner h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Validating...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Continue to Signals</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-400">
          <p>Your address is stored locally and used only for signal execution.</p>
        </div>
      </div>
    </div>
  );
}
