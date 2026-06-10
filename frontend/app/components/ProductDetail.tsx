"use client";

import { useState } from "react";

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
}

export default function ProductDetail({ product }: ProductDetailProps) {
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
    // This will connect to your cart state or form hidden message system later
    alert(`Added to cart: ${quantity}x ${product.name} (${selectedVariant?.name || 'Default'})`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white min-h-full rounded-xl shadow-sm border border-gray-100 my-4">
      
      {/* Upper Layout: Images and Main Checkout Details */}
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Image Gallery */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="w-full h-80 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center p-4 overflow-hidden">
            <img 
              src={images[activeImgIdx]} 
              alt={product.name} 
              className="max-h-full max-w-full object-contain transition-all duration-300" 
            />
          </div>
          
          {/* Thumbnails row */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIdx(idx)}
                  className={`w-16 h-16 border rounded-lg p-1 bg-white flex items-center justify-center overflow-hidden shrink-0 transition-all ${
                    activeImgIdx === idx ? "border-green-600 ring-2 ring-green-100" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <img src={img} alt="" className="max-h-full max-w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Title, Price, Variants, Buttons */}
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <span className="text-xs font-bold text-green-700 tracking-wider uppercase bg-green-50 px-2 py-1 rounded">
              {product.attributes?.type || "Product"}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2 leading-tight">{product.name}</h1>
            <p className="text-xs text-gray-400 mt-1">ID: {product.id}</p>
          </div>

          {/* Price & Stock Display */}
          <div className="flex items-baseline gap-3 border-y border-gray-100 py-3">
            <span className="text-3xl font-extrabold text-gray-900">
              Rs. {currentPrice.amount.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 font-medium">{currentPrice.currency}</span>
            
            <div className="ml-auto">
              {isAvailable ? (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  stockLevel === 'low' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                }`}>
                  {stockLevel === 'low' ? 'Low Stock' : 'In Stock'}
                </span>
              ) : (
                <span className="text-xs font-semibold bg-red-100 text-red-800 px-2.5 py-1 rounded-full">
                  Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Variants Selection */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                Available Options
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    disabled={!v.in_stock}
                    className={`px-4 py-2 text-sm font-medium border rounded-xl transition-all ${
                      !v.in_stock ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through" :
                      selectedVariant?.id === v.id 
                        ? "border-green-600 bg-green-50 text-green-700 shadow-sm" 
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Add to Cart Action layout */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center border border-gray-300 rounded-xl bg-gray-50 overflow-hidden h-12">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-3 text-lg font-bold hover:bg-gray-200 text-gray-600 transition-colors h-full"
              >
                −
              </button>
              <span className="px-3 font-semibold text-sm text-gray-800 w-10 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="px-3 text-lg font-bold hover:bg-gray-200 text-gray-600 transition-colors h-full"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!isAvailable}
              className="flex-1 bg-green-600 text-white h-12 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Lower Layout: Long Description & Specifications */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider mb-3">Product Description</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          {product.description}
        </p>
      </div>

      {/* Metadata Attributes table */}
      {product.attributes && (
        <div className="mt-6 border-t border-gray-100 pt-6">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Specifications</h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-white p-3 border border-gray-100 rounded-xl text-sm">
            {product.attributes.vendor && (
              <>
                <div className="text-gray-400">Vendor</div>
                <div className="text-gray-800 font-medium">{product.attributes.vendor}</div>
              </>
            )}
            {product.attributes.subtype && (
              <>
                <div className="text-gray-400">Subtype</div>
                <div className="text-gray-800 font-medium">{product.attributes.subtype}</div>
              </>
            )}
            {product.attributes.weight && product.attributes.weight !== "0" && (
              <>
                <div className="text-gray-400">Weight</div>
                <div className="text-gray-800 font-medium">{product.attributes.weight} kg</div>
              </>
            )}
            <div className="text-gray-400">Original Link</div>
            <div>
              <a href={product.url} target="_blank" rel="noreferrer" className="text-green-600 hover:underline text-xs break-all">
                View on Kapruka Website
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}