import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "~/lib/connectDB";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let client;

  try {
    console.log("API: Starting trade execution...");

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

    const body = await request.json();
    console.log("API: Received trade data:", body);

    // Validate required fields
    if (!body.tweetId || !body.safeAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "tweetId and safeAddress are required",
        },
        { status: 400 }
      );
    }

    // Connect to farcaster database
    client = await connectDB("farcaster");
    const db = client.db();

    console.log("API: Connected to farcaster database");

    const collection = db.collection("trading-signals-farcaster");

    // Check if this signal is already executed by this user
    const existingExecution = await collection.findOne({
      // signalId: body.signalId,
      tweetId: body.tweetId,
      safeAddress: body.safeAddress,
    });

    if (existingExecution) {
      return NextResponse.json(
        {
          success: false,
          error: "Already executed",
          message: "This signal has already been executed by this user",
        },
        { status: 409 }
      );
    }

    // Prepare execution data
    const executionData = {
      // signalId: body.signalId,
      tweetId: body.tweetId,
      safeAddress: body.safeAddress,
      username: body.username || "",
      executedAt: new Date(),
      tradeData: {
        signalMessage: body["Signal Message"] || "",
        tokenMentioned: body["Token Mentioned"] || "",
        tp1: body["TP1"] || 0,
        tp2: body["TP2"] || 0,
        stopLoss: body["SL"] || 0,
        currentPrice: body["Current Price"] || 0,
        maxExitTime: body["Max Exit Time"] || new Date(),
      },
    };

    // Insert the execution record
    const insertResult = await collection.insertOne(executionData);

    if (!insertResult.insertedId) {
      return NextResponse.json(
        {
          success: false,
          error: "Insert failed",
          message: "Failed to store trade execution",
        },
        { status: 500 }
      );
    }

    console.log(
      "API: Trade execution recorded successfully with ID:",
      insertResult.insertedId
    );

    if (client) {
      await client.close();
      console.log("API: Database connection closed");
    }

    return NextResponse.json(
      {
        success: true,
        message: "Trade executed successfully",
        executionId: insertResult.insertedId.toString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error executing trade:", error);
    if (client) {
      await client.close();
      console.log("API: Database connection closed");
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute trade",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
