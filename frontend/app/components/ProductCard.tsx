import { motion } from "framer-motion";

interface Product {
  id?: string;
  title: string;
  price: number | string;
  imageUrl: string;
  index: number;
  onSendMessage?: (text: string) => void;
}

export default function ProductCard({ id, title, price, imageUrl, index, onSendMessage }: Product) {
  const validImageUrl = imageUrl || "https://placehold.co/300x300?text=Kapruka+Item";
  const isEven = index % 2 === 0;

  const handleViewDetails = () => {
    if (onSendMessage) {
      onSendMessage(`SYSTEM_COMMAND: Get details for product ID '${id}' named '${title}'`);
    } else {
      alert(`Requesting details for: ${title}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`flex flex-col md:flex-row gap-6 md:gap-10 items-center ${isEven ? "" : "md:flex-row-reverse"}`}
    >
      {/* Image Side */}
      <div className="w-full md:w-1/2 aspect-square md:aspect-[4/3] bg-slate-100/30 border border-[#d1ccbf]/50 rounded-3xl relative flex items-center justify-center p-6 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <img 
          src={validImageUrl} 
          alt={title} 
          className="max-h-full max-w-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500" 
        />
      </div>
      
      {/* Details Side */}
      <div className={`w-full md:w-1/2 flex flex-col justify-center gap-4 ${isEven ? "md:pr-8" : "md:pl-8"}`}>
        <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full w-fit">Kapruka Curated</span>
        
        <h3 className="text-2xl md:text-3xl font-semibold text-stone-900 leading-tight tracking-tight">{title}</h3>
        
        <p className="text-slate-600 text-sm leading-relaxed mb-2 line-clamp-3">
          A premium selection available right now on Kapruka. Perfect for any special occasion.
        </p>

        <div className="flex items-center gap-4 mt-2">
          <span className="text-2xl font-bold text-stone-900">
            {typeof price === "number" ? `Rs. ${price.toLocaleString()}` : price}
          </span>
        </div>

        <button 
          onClick={handleViewDetails}
          className="mt-4 px-6 py-3.5 bg-slate-900 text-slate-50 font-semibold rounded-2xl hover:bg-emerald-400 hover:text-emerald-950 transition-all shadow-md w-fit"
        >
          View Details
        </button>
      </div>
    </motion.div>
  );
}