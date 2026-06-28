import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, Minus, Trash2 } from "lucide-react";
import { useState } from "react";

interface CartItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
}

export default function CartSidebar({ cart, onClose, sessionId, onCartUpdated, onSendMessage }: { cart: CartItem[], onClose: () => void, sessionId?: string, onCartUpdated?: () => void, onSendMessage?: (text: string) => void }) {
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleDecrease = async (productId: string) => {
    if (!sessionId) return;
    setLoadingItems(prev => ({ ...prev, [productId]: true }));
    try {
      const res = await fetch(`https://kapruka-agent-backend.onrender.com/api/cart/${sessionId}/decrease`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId })
      });
      if (res.ok && onCartUpdated) {
        onCartUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="w-full h-full bg-[#faf9f6]/95 backdrop-blur-2xl flex flex-col relative z-40">
      {/* Header */}
      <div className="h-[49.2px] px-6 border-b border-[#402970]/50 bg-[#402970]/95 flex items-center justify-between shadow-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-base font-bold text-slate-50 tracking-tight leading-tight">Your Cart</h2>
            <p className="text-[11px] text-[#a79bc7] font-medium leading-tight">{cart.length} items</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-[#a79bc7] hover:text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        <AnimatePresence>
          {cart.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center mt-20"
            >
              <div className="w-20 h-20 bg-[#faf9f6]/50 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">Your cart is empty.</p>
              <p className="text-sm text-slate-400 mt-2">Ask the agent to add products!</p>
            </motion.div>
          ) : (
            cart.map((item, index) => (
              <motion.div
                key={`${item.product_id}-${index}`}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-[#faf9f6]/50 border border-[#d1ccbf]/50 rounded-2xl p-4 flex gap-4 hover:border-slate-400 transition-colors items-center"
              >
                {item.image ? (
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#e0dcd3]/30 border border-[#e0dcd3] flex items-center justify-center">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#e0dcd3]/30 border border-[#e0dcd3] flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="text-[14px] font-semibold text-stone-900 line-clamp-2">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      QTY: {item.quantity}
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">
                      Rs. {item.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center ml-auto">
                  <button
                    onClick={() => handleDecrease(item.product_id)}
                    disabled={loadingItems[item.product_id]}
                    className="p-2 text-slate-400 hover:text-[#402970] hover:bg-[#402970]/10 rounded-xl transition-all disabled:opacity-50"
                  >
                    {item.quantity > 1 ? <Minus className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Total */}
      {cart.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-6 bg-[#faf9f6]/80 border-t border-[#e0dcd3]/60 backdrop-blur-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-600 font-medium text-sm">Estimated Total</span>
            <span className="text-2xl font-bold text-stone-900 tracking-tight">
              Rs. {total.toLocaleString()}
            </span>
          </div>

          <button
            onClick={() => {
              if (onSendMessage) onSendMessage("I'm ready to checkout.");
              onClose();
            }}
            className="w-full py-4 bg-[#402970] hover:bg-[#523590] text-white rounded-xl font-semibold tracking-wide transition-all shadow-[0_0_20px_-5px_rgba(64,41,112,0.3)] hover:shadow-[0_0_25px_-5px_rgba(64,41,112,0.5)] flex items-center justify-center gap-2 relative overflow-hidden group">
            <span className="relative z-10">Proceed to Checkout</span>
            {/* Optional: Add an icon or subtle hover effect inside the button */}
          </button>
          <p className="text-center text-[10px] text-slate-500 mt-3 font-medium">
            Or just tell the agent "I'm ready to checkout!"
          </p>
        </motion.div>
      )}
    </div>
  );
}
