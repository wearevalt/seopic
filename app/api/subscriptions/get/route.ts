import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { subscriptionService } from "@/lib/services/subscriptionService";

export async function GET(req: Request) {
  try {
    const token = await getToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const email = token?.email;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subscription = await subscriptionService.getUserSubscription(email);

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Subscription GET error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}