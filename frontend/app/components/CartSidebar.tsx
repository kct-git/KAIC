import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";

interface CartItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
}

export default function CartSidebar({ cart, onClose }: { cart: CartItem[], onClose: () => void }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="w-full h-full bg-zinc-950/90 border-l border-zinc-800/60 backdrop-blur-2xl flex flex-col shadow-2xl relative z-40">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Your Cart</h2>
            <p className="text-xs text-zinc-400 font-medium">{cart.length} items</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
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
              <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium">Your cart is empty.</p>
              <p className="text-sm text-zinc-600 mt-2">Ask the agent to add products!</p>
            </motion.div>
          ) : (
            cart.map((item, index) => (
              <motion.div
                key={`${item.product_id}-${index}`}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-zinc-900/50 border border-zinc-700/50 rounded-2xl p-4 flex gap-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-zinc-100 truncate">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      QTY: {item.quantity}
                    </span>
                    <span className="text-[13px] font-medium text-zinc-400">
                      Rs. {item.price.toLocaleString()}
                    </span>
                  </div>
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
          className="p-6 bg-zinc-900/80 border-t border-zinc-800/60 backdrop-blur-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <span className="text-zinc-400 font-medium text-sm">Estimated Total</span>
            <span className="text-2xl font-bold text-zinc-50 tracking-tight">
              Rs. {total.toLocaleString()}
            </span>
          </div>
          
          <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold tracking-wide transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 relative overflow-hidden group">
            <span className="relative z-10">Proceed to Checkout</span>
            {/* Optional: Add an icon or subtle hover effect inside the button */}
          </button>
          <p className="text-center text-[10px] text-zinc-500 mt-3 font-medium">
            Or just tell the agent "I'm ready to checkout!"
          </p>
        </motion.div>
      )}
    </div>
  );
}
