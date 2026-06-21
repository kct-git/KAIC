import ProductCard from './ProductCard';

export default function ProductList({ products }: { products: any[] }) {
  return (
    <div className="p-6 md:p-8">
      <div className="border-b border-zinc-800/50 pb-4 mb-8">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
           Handpicked Recommendations
        </h2>
      </div>
      {products && products.length > 0 ? (
        <div className="flex flex-col gap-12">
          {products.map((product: any, index: number) => (
            <ProductCard 
              key={product.id} 
              title={product.name} 
              price={product.price?.amount || 'N/A'} 
              imageUrl={product.image_url || product.images?.[0]}
              index={index}
            />
          ))}
        </div>
      ) : (
        <p className="text-zinc-500 text-center py-10">No products found for this search.</p>
      )}
    </div>
  );
}