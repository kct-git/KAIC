import { NextRequest, NextResponse } from "next/server";

// Ensure this route runs in an environment optimized for streaming responses
export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    // 1. Extract messages AND the dynamic session_id from the frontend request
    const { messages, sessionId } = await req.json();
    const latestMessage = messages[messages.length - 1]?.content;

    if (!latestMessage) {
      return NextResponse.json(
        { error: "No message content found" },
        { status: 400 }
      );
    }

    // Fallback if no sessionId was provided (keep it robust)
    const activeSessionId = sessionId || "default-session";

// 2. Interpolate the session_id into your exact FastAPI endpoint path
    const BACKEND_URL = `http://127.0.0.1:8000/api/chat/${activeSessionId}`;

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: latestMessage,
        // If your LangGraph backend requires a thread_id or historical context, pass it here:
        history: messages.slice(0, -1),
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    // 3. Capture the stream from FastAPI and pass it directly to the client
    const stream = response.body;
    if (!stream) {
      throw new Error("No streamable body returned from backend service.");
    }

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Error in Chat API Route Bridge:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}