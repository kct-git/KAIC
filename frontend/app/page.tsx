"use client";

import { useChat } from "@ai-sdk/react";
import { log } from "console";
import { useEffect, useState, useRef } from "react";

interface Product {
  id: string;
  title: string;
  price: number | string;
  imageUrl: string;
}

function ProductCard({ title, price, imageUrl }: Omit<Product, "id">) {
  const validImageUrl = imageUrl || "https://placehold.co/300x300?text=Kapruka+Item";

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all hover:shadow-md">
      <div className="w-full h-48 bg-gray-100 relative flex items-center justify-center p-2">
        <img src={validImageUrl} alt={title} className="max-h-full max-w-full object-contain mix-blend-multiply" />
      </div>
      <div className="p-4 flex flex-col flex-1 justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px]">{title}</h3>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-base font-bold text-green-700">
            {typeof price === "number" ? `Rs. ${price.toLocaleString()}` : price}
          </span>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">Kapruka</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [input, setInput] = useState("");  // ← manual input state
  const messagesEndRef = useRef<HTMLDivElement>(null);

    // useEffect(() => {
    //   let currentSessionId = localStorage.getItem("kapruka_session_id");
    //   if (!currentSessionId) {
    //     currentSessionId = crypto.randomUUID();
    //     localStorage.setItem("kapruka_session_id", currentSessionId);
    //   }
    //   setSessionId(currentSessionId);
    //   console.log("session id O ", sessionId)
    // }, []);

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
      // Check parts array (v5 style)
      const textContent = lastMessage.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");

      if (textContent?.includes("```json")) {
        try {
          const match = textContent.match(/```json([\s\S]*?)```/);
          if (match && match[1]) {
            const data = JSON.parse(match[1].trim());
            if (data.products && Array.isArray(data.products)) {
              setProducts(data.products);
            }
          }
        } catch (err) {
          console.error("Failed to parse product JSON:", err);
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
      <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto p-6">
        <div className="max-w-5xl w-full mx-auto">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-xl font-bold text-gray-800">Discovery Canvas</h2>
            <p className="text-xs text-gray-500">Items matching your current request or conversation</p>
          </div>

          {products.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center text-gray-400">
              <p className="text-base font-semibold">No products displayed yet</p>
              <p className="text-xs mt-1 max-w-sm">
                Chat with the AI agent on the right to search for products, match gifts, or curate catalog lists.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} title={product.title} price={product.price} imageUrl={product.imageUrl} />
              ))}
            </div>
          )}
        </div>
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
              if (displayText.includes("```json")) {
                displayText = displayText.split("```json")[0] || "Processing...";
              }

              if (!displayText) return null; // ✅ skip empty messages

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