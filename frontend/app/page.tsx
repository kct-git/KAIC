"use client";
import DynamicRenderer from "./components/DynamicRenderer";

import { useChat } from "@ai-sdk/react";
import { Sparkles, Send, Bot, ArrowRight, ShoppingBag } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CartSidebar from "./components/CartSidebar";

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let currentSessionId = sessionStorage.getItem("kapruka_session_id");
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
      sessionStorage.setItem("kapruka_session_id", currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  const { messages, sendMessage, isLoading } = useChat({
    api: "/api/chat",
    streamProtocol: "data",
    body: { sessionId: sessionId, }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input }, { body: { sessionId } });
    setInput("");
  };

  const suggestPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const extractViewState = (text: string) => {
    if (!text) return null;
    if (text.includes("__VIEW_STATE__")) {
      try {
        const viewStr = text.split("__VIEW_STATE__")[1];
        return JSON.parse(viewStr);
      } catch (err) {
        return null;
      }
    }
    return null;
  };

  const extractCartState = (text: string) => {
    if (!text) return null;
    if (text.includes("__CART_STATE__")) {
      try {
        const cartStr = text.split("__CART_STATE__")[1];
        return JSON.parse(cartStr);
      } catch (err) {
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    let latestCart = cart;
    for (const m of messages) {
      let rawText = "";
      if (m.parts && m.parts.length > 0) {
        rawText = m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
      } else if (typeof m.content === "string") {
        rawText = m.content;
      }
      const cartState = extractCartState(rawText);
      if (cartState) latestCart = cartState;
    }
    
    // Check if new items were added while closed
    if (latestCart.length > cart.length && !isCartOpen) {
      setUnseenCount(prev => prev + (latestCart.length - cart.length));
    }
    setCart(latestCart);
  }, [messages]);

  if (!sessionId) return null;

  return (
    <div className="min-h-screen w-full flex justify-center bg-zinc-950 text-zinc-50 font-sans relative selection:bg-zinc-800 selection:text-white">

      {/* Background gradients for premium feel */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

      {/* Main Container - 2 Column Layout */}
      <div className="w-full flex flex-row relative z-10 h-screen overflow-hidden">

        {/* Left Column: Chat Area */}
        <div className="flex-1 flex flex-col relative h-full">

          {/* Header */}
          <div className="sticky top-0 w-full px-6 py-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl z-50 border-b border-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/50 shadow-inner">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-zinc-100 tracking-tight">Kapruka Concierge</h1>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Your personal shopping assistant</p>
              </div>
            </div>

            {/* Cart Toggle Button */}
            {!isCartOpen && (
              <button 
                onClick={() => { setIsCartOpen(true); setUnseenCount(0); }}
                className="relative p-2.5 bg-zinc-900 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 rounded-xl transition-all"
              >
                <ShoppingBag className="w-5 h-5 text-zinc-300" />
                {unseenCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-lg animate-bounce">
                    {unseenCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 pb-40 no-scrollbar flex flex-col gap-8">
            <AnimatePresence>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center text-center mt-20"
                >
                  <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-8 border border-zinc-700/30 shadow-2xl">
                    <Bot className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-semibold text-zinc-100 mb-3 tracking-tight">How can I help you today?</h2>
                  <p className="text-base text-zinc-400 max-w-md leading-relaxed mb-10">
                    I can find products, assemble gift packages, or help you track an order. Just ask!
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
                    {[
                      "I need a birthday cake 🎂",
                      "Show me some electronics 💻",
                      "I want to send an apology gift 💐",
                      "Track my last order 🚚"
                    ].map((suggestion, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => suggestPrompt(suggestion)}
                        className="flex items-center justify-between px-5 py-4 bg-zinc-900/60 border border-zinc-700/50 rounded-2xl text-[15px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors text-left backdrop-blur-sm"
                      >
                        <span className="truncate">{suggestion}</span>
                        <ArrowRight className="w-4 h-4 text-zinc-500" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((m) => {
                  let rawText = "";

                  if (m.parts && m.parts.length > 0) {
                    rawText = m.parts
                      .filter((p: any) => p.type === "text")
                      .map((p: any) => p.text)
                      .join("");
                  } else if (typeof m.content === "string") {
                    rawText = m.content;
                  }

                  const viewState = extractViewState(rawText);

                  let displayText = rawText;
                  if (displayText.includes("```json")) {
                    displayText = displayText.split("```json")[0];
                  }
                  if (displayText.includes("__VIEW_STATE__")) {
                    displayText = displayText.split("__VIEW_STATE__")[0];
                  }
                  if (displayText.includes("__CART_STATE__")) {
                    displayText = displayText.split("__CART_STATE__")[0];
                  }

                  const isUser = m.role === "user";

                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className={`flex flex-col w-full ${isUser ? "items-end" : "items-start"}`}
                    >
                      {/* Text Bubble */}
                      {displayText.trim() && (
                        <div className={`flex max-w-[85%] ${isUser ? "justify-end" : "justify-start gap-4"}`}>
                          {!isUser && (
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/50 shrink-0 shadow-sm mt-1">
                              <Sparkles className="w-5 h-5 text-emerald-400" />
                            </div>
                          )}

                          <div
                            className={`p-5 text-[16px] leading-relaxed shadow-md ${isUser
                                ? "bg-zinc-100 text-zinc-900 rounded-3xl rounded-tr-sm font-medium"
                                : "bg-zinc-900/80 text-zinc-200 border border-zinc-700/50 rounded-3xl rounded-tl-sm backdrop-blur-md"
                              }`}
                          >
                            {displayText}
                          </div>
                        </div>
                      )}

                      {/* Inline Generative UI Component */}
                      {!isUser && viewState && (
                        <div className="mt-6 w-full pl-14">
                          <div className="w-full bg-zinc-900/30 border border-zinc-800/60 rounded-3xl backdrop-blur-sm overflow-hidden shadow-xl">
                            <DynamicRenderer
                              viewState={viewState}
                              onSendMessage={(text: string) => sendMessage({ text }, { body: { sessionId } })}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start gap-4 w-full"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/50 shrink-0 shadow-sm mt-1">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="px-5 py-4 bg-zinc-900/80 border border-zinc-700/50 rounded-3xl rounded-tl-sm flex items-center gap-2 backdrop-blur-md">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-emerald-500/70 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-emerald-500/40 rounded-full" />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* Fixed Input Area */}
          <div className="absolute bottom-0 left-0 w-full flex justify-center p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent z-50 pointer-events-none">
            <div className="w-full max-w-3xl pointer-events-auto">
              <form onSubmit={handleFormSubmit} className="relative flex items-center shadow-2xl">
                <input
                  className="w-full pl-6 pr-16 py-5 text-[16px] bg-zinc-900/90 border border-zinc-700/80 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 text-zinc-100 placeholder-zinc-500 transition-all backdrop-blur-xl shadow-inner"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your concierge anything..."
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-3 p-3 bg-zinc-100 text-zinc-900 rounded-xl hover:bg-white hover:scale-105 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:hover:scale-100 transition-all shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              <div className="mt-3 flex justify-center">
                <p className="text-[11px] text-zinc-500 font-medium tracking-wide">AI Generated Content. May contain inaccuracies.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Cart Sidebar */}
        <AnimatePresence>
          {isCartOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-full shrink-0 overflow-hidden flex"
            >
              <CartSidebar cart={cart} onClose={() => setIsCartOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}