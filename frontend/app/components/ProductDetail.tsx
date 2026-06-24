"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Variant {
  id: string;
  name: string;
  sku: string;
  price: { amount: number; currency: string };
  in_stock: boolean;
  stock_level: string;
}

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: { amount: number; currency: string };
    in_stock: boolean;
    stock_level: string;
    images: string[];
    variants: Variant[];
    attributes?: {
      type?: string;
      subtype?: string;
      vendor?: string;
      weight?: string;
    };
    url: string;
  };
  onSendMessage?: (text: string) => void;
}

export default function ProductDetail({ product, onSendMessage }: ProductDetailProps) {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant>(
    product.variants?.[0] || null
  );
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const images = product.images?.length > 0 
    ? product.images 
    : ["https://placehold.co/600x600?text=No+Image+Available"];

  const currentPrice = selectedVariant 
    ? selectedVariant.price 
    : product.price;

  const isAvailable = selectedVariant 
    ? selectedVariant.in_stock 
    : product.in_stock;

  const stockLevel = selectedVariant 
    ? selectedVariant.stock_level 
    : product.stock_level;

  const handleAddToCart = () => {
    if (onSendMessage) {
       onSendMessage(`SYSTEM_COMMAND: Add ${quantity} of product ID '${product.id}' named '${product.name}' to my cart.`);
    } else {
       alert(`Added to cart: ${quantity}x ${product.name} (${selectedVariant?.name || 'Default'})`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-zinc-900/40 min-h-full rounded-2xl shadow-xl border border-zinc-800/60 my-4 backdrop-blur-md">
      
      {/* Upper Layout: Images and Main Checkout Details */}
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Image Gallery */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="w-full h-80 bg-zinc-800/40 border border-zinc-700/50 rounded-2xl flex items-center justify-center p-4 overflow-hidden relative shadow-inner">
            <motion.img 
              key={activeImgIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              src={images[activeImgIdx]} 
              alt={product.name} 
              className="max-h-full max-w-full object-contain drop-shadow-xl" 
            />
          </div>
          
          {/* Thumbnails row */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar mt-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIdx(idx)}
                  className={`w-16 h-16 border rounded-xl p-1.5 flex items-center justify-center overflow-hidden shrink-0 transition-all ${
                    activeImgIdx === idx ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-zinc-800" : "border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-500"
                  }`}
                >
                  <img src={img} alt="" className="max-h-full max-w-full object-contain drop-shadow-md" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Title, Price, Variants, Buttons */}
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              {product.attributes?.type || "Product"}
            </span>
            <h1 className="text-3xl font-semibold text-zinc-100 mt-4 leading-tight tracking-tight">{product.name}</h1>
            <p className="text-xs text-zinc-500 mt-2 font-medium">ID: {product.id}</p>
          </div>

          {/* Price & Stock Display */}
          <div className="flex items-baseline gap-3 border-y border-zinc-800/60 py-4 my-2">
            <span className="text-4xl font-bold text-zinc-50 tracking-tight">
              Rs. {currentPrice.amount.toLocaleString()}
            </span>
            <span className="text-sm text-zinc-400 font-medium">{currentPrice.currency}</span>
            
            <div className="ml-auto">
              {isAvailable ? (
                <span className={`text-[11px] font-bold tracking-wide uppercase px-3 py-1.5 rounded-md border ${
                  stockLevel === 'low' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {stockLevel === 'low' ? 'Low Stock' : 'In Stock'}
                </span>
              ) : (
                <span className="text-[11px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-md">
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Variants Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">
                Available Options
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    disabled={!v.in_stock}
                    className={`px-4 py-2.5 text-sm font-medium border rounded-xl transition-all ${
                      !v.in_stock ? "bg-zinc-800/30 text-zinc-600 border-zinc-800 cursor-not-allowed line-through" :
                      selectedVariant?.id === v.id 
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]" 
                        : "border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Add to Cart Action layout */}
          <div className="flex items-center gap-4 mt-auto pt-4">
            <div className="flex items-center border border-zinc-700/60 rounded-xl bg-zinc-800/50 overflow-hidden h-14">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-4 text-xl font-medium hover:bg-zinc-700/80 text-zinc-400 transition-colors h-full"
              >
                −
              </button>
              <span className="px-4 font-semibold text-base text-zinc-100 w-12 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="px-4 text-xl font-medium hover:bg-zinc-700/80 text-zinc-400 transition-colors h-full"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!isAvailable}
              className="flex-1 bg-emerald-600 text-white h-14 rounded-xl text-[15px] font-semibold hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.6)]"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Lower Layout: Long Description & Specifications */}
      <div className="mt-10 border-t border-zinc-800/60 pt-8">
        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-4">Product Description</h2>
        <p className="text-[15px] text-zinc-400 leading-relaxed whitespace-pre-line bg-zinc-800/30 p-5 rounded-2xl border border-zinc-700/30">
          {product.description}
        </p>
      </div>

      {/* Metadata Attributes table */}
      {product.attributes && (
        <div className="mt-8 border-t border-zinc-800/60 pt-8">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-4">Specifications</h2>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-zinc-800/30 p-5 border border-zinc-700/30 rounded-2xl text-[15px]">
            {product.attributes.vendor && (
              <>
                <div className="text-zinc-500 font-medium">Vendor</div>
                <div className="text-zinc-200 font-medium">{product.attributes.vendor}</div>
              </>
            )}
            {product.attributes.subtype && (
              <>
                <div className="text-zinc-500 font-medium">Subtype</div>
                <div className="text-zinc-200 font-medium">{product.attributes.subtype}</div>
              </>
            )}
            {product.attributes.weight && product.attributes.weight !== "0" && (
              <>
                <div className="text-zinc-500 font-medium">Weight</div>
                <div className="text-zinc-200 font-medium">{product.attributes.weight} kg</div>
              </>
            )}
            <div className="text-zinc-500 font-medium">Original Link</div>
            <div>
              <a href={product.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors hover:underline text-[13px] break-all font-medium">
                View on Kapruka Website
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}