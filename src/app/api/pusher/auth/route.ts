import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { authorizePusher } from "@/lib/pusher";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { socket_id: socketId, channel_name: channelName } = body;
    
    if (!socketId || !channelName) {
      return NextResponse.json(
        { message: "Invalid request" },
        { status: 400 }
      );
    }
    
    // Authorize the channel
    const authResponse = authorizePusher(socketId, channelName, session.user.id);
    
    return NextResponse.json(authResponse);
  } catch (error: unknown) {
    console.error("Pusher auth error:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to authorize Pusher";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}