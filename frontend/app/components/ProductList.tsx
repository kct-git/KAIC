import ProductCard from './ProductCard'; // Make sure to extract ProductCard to its own file or place it here!

export default function ProductList({ products }: { products: any[] }) {
  return (
    <div className="p-8">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Search Results</h2>
      </div>
      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((product: any) => (
            <ProductCard 
              key={product.id} 
              title={product.name} 
              price={product.price?.amount || 'N/A'} 
              imageUrl={product.image_url || product.images?.[0]} 
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No products found for this search.</p>
      )}
    </div>
  );
}