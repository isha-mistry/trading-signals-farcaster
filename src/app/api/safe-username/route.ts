import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const { safeAddress } = await request.json();

    if (!safeAddress) {
      return NextResponse.json(
        { success: false, error: "Safe address is required" },
        { status: 400 }
      );
    }

    // Connect to the safe-deployment-service database
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("safe-deployment-service");
    const safesCollection = db.collection("safes");

    // Search for the safe address in deployments.arbitrum.address
    const safe = await safesCollection.findOne({
      "deployments.arbitrum.address": safeAddress,
    });

    await client.close();

    if (!safe) {
      return NextResponse.json(
        {
          success: false,
          error: "Safe address not found in arbitrum deployments",
        },
        { status: 404 }
      );
    }

    // Extract username from userInfo.userId
    const username = safe.userInfo?.userId;

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Username not found for this safe address" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        username,
        safeAddress,
        safeId: safe.safeId,
      },
    });
  } catch (error) {
    console.error("Error fetching safe username:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
