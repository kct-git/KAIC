interface Product {
  id: string;
  title: string;
  price: number | string;
  imageUrl: string;
}

export default function ProductCard({ title, price, imageUrl }: Omit<Product, "id">) {
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