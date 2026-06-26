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
    <div className="w-full h-full bg-[#f4f1ea]/90 border-l border-[#e0dcd3]/60 backdrop-blur-2xl flex flex-col shadow-2xl relative z-40">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#e0dcd3]/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">Your Cart</h2>
            <p className="text-xs text-slate-600 font-medium">{cart.length} items</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 text-slate-600 hover:text-white hover:bg-[#f4f1ea] rounded-xl transition-colors"
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
                className="bg-[#faf9f6]/50 border border-[#d1ccbf]/50 rounded-2xl p-4 flex gap-4 hover:border-slate-400 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-stone-900 truncate">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      QTY: {item.quantity}
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">
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
          className="p-6 bg-[#faf9f6]/80 border-t border-[#e0dcd3]/60 backdrop-blur-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-600 font-medium text-sm">Estimated Total</span>
            <span className="text-2xl font-bold text-stone-900 tracking-tight">
              Rs. {total.toLocaleString()}
            </span>
          </div>
          
          <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold tracking-wide transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 relative overflow-hidden group">
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
