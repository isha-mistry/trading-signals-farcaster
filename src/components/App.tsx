"use client";

import { useEffect } from "react";
import { useMiniApp } from "@neynar/react";
// Removed Header and Footer for a clean, focused mobile UI
import { HomeTab, ActionsTab, ContextTab, WalletTab } from "~/components/ui/tabs";
import { USE_WALLET } from "~/lib/constants";
import { useNeynarUser } from "../hooks/useNeynarUser";

// --- Types ---
export enum Tab {
  Home = "home",
  Actions = "actions",
  Context = "context",
  Wallet = "wallet",
}

export interface AppProps {
  title?: string;
}

/**
 * App component serves as the main container for the mini app interface.
 * 
 * This component orchestrates the overall mini app experience by:
 * - Managing tab navigation and state
 * - Handling Farcaster mini app initialization
 * - Coordinating wallet and context state
 * - Providing error handling and loading states
 * - Rendering the appropriate tab content based on user selection
 * 
 * The component integrates with the Neynar SDK for Farcaster functionality
 * and Wagmi for wallet management. It provides a complete mini app
 * experience with multiple tabs for different functionality areas.
 * 
 * Features:
 * - Tab-based navigation (Home, Actions, Context, Wallet)
 * - Farcaster mini app integration
 * - Wallet connection management
 * - Error handling and display
 * - Loading states for async operations
 * 
 * @param props - Component props
 * @param props.title - Optional title for the mini app (defaults to "ArbMaxx")
 * 
 * @example
 * ```tsx
 * <App title="My Mini App" />
 * ```
 */
export default function App(
  { title }: AppProps = { title: "ArbMaxx" }
) {
  // --- Hooks ---
  const {
    isSDKLoaded,
    context,
    setInitialTab,
    setActiveTab,
    currentTab,
  } = useMiniApp();

  // --- Neynar user hook ---
  const { user: neynarUser } = useNeynarUser(context || undefined);

  // --- Effects ---
  /**
   * Sets the initial tab to "home" when the SDK is loaded.
   * 
   * This effect ensures that users start on the home tab when they first
   * load the mini app. It only runs when the SDK is fully loaded to
   * prevent errors during initialization.
   */
  useEffect(() => {
    if (isSDKLoaded) {
      setInitialTab(Tab.Home);
    }
  }, [isSDKLoaded, setInitialTab]);

  // --- Early Returns ---
  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
        <div className="text-center animate-fade-in-up">
          <div className="spinner h-12 w-12 mx-auto mb-6 animate-pulse-glow"></div>
          <p className="text-gray-300 text-lg font-medium">Loading ArbMaxx...</p>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-blue-500/30">
        <div className="container py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div> */}
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-200 via-blue-400 to-blue-300 bg-clip-text text-transparent">
                ArbMaxx
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Tab content rendering */}
        <div className="animate-fade-in-up">
          {currentTab === Tab.Home && <HomeTab />}
          {currentTab === Tab.Actions && <ActionsTab />}
          {currentTab === Tab.Context && <ContextTab />}
          {currentTab === Tab.Wallet && <WalletTab />}
        </div>
      </div>
    </div>
  );
}

