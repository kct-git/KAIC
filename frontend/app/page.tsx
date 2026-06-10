"use client";
import DynamicRenderer from "./components/DynamicRenderer";

import { useChat } from "@ai-sdk/react";
import { log } from "console";
import { Component } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  // const [products, setProducts] = useState<Product[]>([]);
  const [activeView, setActiveView] = useState<any>(null);
  const [input, setInput] = useState("");  // ← manual input state
  const messagesEndRef = useRef<HTMLDivElement>(null);

    // for testing purposes
    useEffect(() => {
      let currentSessionId = sessionStorage.getItem("kapruka_session_id");
      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        sessionStorage.setItem("kapruka_session_id", currentSessionId);
      }
      setSessionId(currentSessionId);
    }, []);

  const { messages, sendMessage } = useChat({
    api: "/api/chat",
    streamProtocol: "data",
    body: { sessionId: sessionId, }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === "assistant") {
          const textContent = lastMessage.parts
            ?.filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join("") || lastMessage.content;

      // Extract the hidden view state if it exists
      if (textContent && textContent.includes("__VIEW_STATE__")) {
        try {
          const viewStr = textContent.split("__VIEW_STATE__")[1];
          const viewData = JSON.parse(viewStr);
          setActiveView(viewData);
        } catch (err) {
          console.error("Failed to parse view state:", err);
        }
      }
    }
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input }, { body: { sessionId } });  // ← v5 style
    setInput("");                  // ← clear manually
  };

  // Don't render until sessionId is ready
  if (!sessionId) return null;

  return (
    <div className="h-screen w-full flex bg-white text-gray-900 overflow-hidden">

      {/* Canvas Column */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto p-0">
        <DynamicRenderer viewState={activeView} />
      </div>

      {/* Chat Column */}
      <div className="w-[35%] min-w-[360px] max-w-[480px] flex flex-col bg-white h-full border-l border-gray-200 shrink-0">

        <div className="p-4 border-b border-gray-200 bg-white shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <h1 className="text-lg font-bold text-gray-800">Kapruka AI Assistant</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Your personalized e-commerce shopping concierge</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
              <p className="text-sm font-medium">Hi! Looking for something specific on Kapruka today?</p>
              <p className="text-xs mt-1 max-w-[240px]">Try asking for birthday cakes, flower bouquets, or electronic items.</p>
            </div>
          ) : (
            messages.map((m) => {

              // ← v5: extract text from parts
              let displayText = "";

              if (m.parts && m.parts.length > 0) {
                displayText = m.parts
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join("");
              } else if (typeof m.content === "string") {
                // fallback
                displayText = m.content;
              }

              // Hide raw JSON blocks
              // Hide raw JSON blocks and our custom view state delimiter
              if (displayText.includes("```json")) {
                displayText = displayText.split("```json")[0];
              }

              if (displayText.includes("__VIEW_STATE__")) {
                displayText = displayText.split("__VIEW_STATE__")[0];
              }

              if (!displayText.trim()) return null; // skip empty messages

              return (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`p-3.5 rounded-xl max-w-[85%] text-sm shadow-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-green-600 text-white rounded-tr-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                    }`}
                  >
                    {displayText}
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <input
              className="flex-1 p-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 bg-white text-gray-900 placeholder-gray-400 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}  // ← standard React state
              placeholder="Type your request here..."
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm shrink-0"
            >
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}