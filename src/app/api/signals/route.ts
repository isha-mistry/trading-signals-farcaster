import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "~/lib/connectDB";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let client;
  let farcasterClient;

  try {
    console.log("API: Starting signals fetch...");

    if (!process.env.MONGODB_URI) {
      console.error("API: MONGODB_URI not found in environment variables");

      return NextResponse.json(
        {
          success: false,
          error: "Database configuration error",
          message: "MongoDB URI not configured",
        },
        { status: 500 }
      );
    }

    // Connect to main database for signals
    client = await connectDB();
    const db = client.db();

    console.log("API: Connected to main database");

    const collection = db.collection("trading-signals");

    const latestSignals = await collection
      .find({})
      .sort({ generatedAt: -1 })
      .limit(10)
      .toArray();

    console.log(`API: Found ${latestSignals.length} signals`);

    // Connect to farcaster database to check execution status
    farcasterClient = await connectDB("farcaster");
    const farcasterDb = farcasterClient.db();
    const executionCollection = farcasterDb.collection(
      "trading-signals-farcaster"
    );

    // Get all tweet IDs to check execution status
    const tweetIds = latestSignals.map((signal) => signal.tweet_id);

    // Fetch execution records for these signals using tweet_id
    const executions = await executionCollection
      .find({ tweetId: { $in: tweetIds } })
      .toArray();

    console.log(`API: Found ${executions.length} execution records`);

    // Create a map of tweetId to executions for quick lookup
    const executionMap = new Map();
    executions.forEach((execution) => {
      if (!executionMap.has(execution.tweetId)) {
        executionMap.set(execution.tweetId, []);
      }
      executionMap.get(execution.tweetId).push(execution);
    });

    // Enhance signals with execution data
    const enhancedSignals = latestSignals.map((signal) => ({
      ...signal,
      executedBy: executionMap.get(signal.tweet_id) || [],
      isExecuted: (executionMap.get(signal.tweet_id) || []).length > 0,
    }));

    if (client) {
      await client.close();
      console.log("API: Main database connection closed");
    }

    if (farcasterClient) {
      await farcasterClient.close();
      console.log("API: Farcaster database connection closed");
    }

    return NextResponse.json(
      {
        success: true,
        data: enhancedSignals,
        count: enhancedSignals.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching latest signals:", error);
    if (client) {
      await client.close();
      console.log("API: Main database connection closed");
    }
    if (farcasterClient) {
      await farcasterClient.close();
      console.log("API: Farcaster database connection closed");
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch latest signals",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
