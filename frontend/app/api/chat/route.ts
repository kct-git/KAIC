import { NextRequest, NextResponse } from "next/server";

import { createUIMessageStreamResponse, createUIMessageStream } from "ai";
import { log } from "console";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId } = await req.json();
    console.log("Last message raw:", JSON.stringify(messages[messages.length - 1]));

    const lastMessage = messages[messages.length - 1];
    const latestMessage =
      lastMessage?.content || // fallback for plain string content
      lastMessage?.parts
        ?.filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join("") ||
      "";

    if (!latestMessage) {
      return NextResponse.json(
        { error: "No message content found" },
        { status: 400 }
      );
    }

    console.log("session id ", sessionId)

    const activeSessionId = sessionId || "default-session";
    const BACKEND_URL = `http://127.0.0.1:8000/api/chat/${activeSessionId}`;

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: latestMessage,
        user_id: activeSessionId, // Required by backend ChatRequest
        history: messages.slice(0, -1),
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    const messageText = data.agent_response || "No response from agent.";
    const cat_tool_response = data.left_panel_view || null;

    // Normalize the view result — dedup arrays, pass objects through, null if nothing
    const view_result = (() => {
      if (!cat_tool_response) return null;

      // Product list — deduplicate by id
      if (Array.isArray(cat_tool_response.data)) {
        const uniqueProducts = Array.from(
          new Map(cat_tool_response.data.map((p: any) => [p.id || p.name || p.url, p])).values()
        );
        return {
          type: cat_tool_response.type,
          data: uniqueProducts,
        };
      }

      // Single product detail or any other shape — pass through as-is
      return cat_tool_response;
    })();

    console.log("Agent response:", messageText);
    console.log("Stored Categories: ", data.left_panel_view);
    console.log("Stored Categories(unique): ", view_result);

    const stream = createUIMessageStream({
      execute({ writer }) {
        const responseMessageId = `assistant-${Date.now()}`;

        writer.write({
          type: "text-start",
          id: responseMessageId,
        });

        writer.write({
          type: "text-delta",
          id: responseMessageId,
          delta: messageText,
        });

        // NEW: If there is a view state, append it securely hidden in the text stream
        if (view_result) {
          writer.write({
            type: "text-delta",
            id: responseMessageId,
            delta: `\n\n__VIEW_STATE__${JSON.stringify(view_result)}__VIEW_STATE__`
          });
        }

        writer.write({
          type: "text-end",
          id: responseMessageId,
        });
      },
    });

    return createUIMessageStreamResponse({
      stream,
    });

  } catch (error: any) {
    console.error("Error in Chat API Route Bridge:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}