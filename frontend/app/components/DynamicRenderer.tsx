import CategoryGrid from './CategoryGrid';
import ProductList from './ProductList';
import ProductDetail from './ProductDetail';

export default function DynamicRenderer({ viewState }: { viewState: any }) {
  if (!viewState) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6">
        <p className="text-base font-semibold text-gray-600">No view selected</p>
        <p className="text-sm mt-2 max-w-md">Chat with the agent to search products or categories.</p>
      </div>
    );
  }

  switch (viewState.type) {
    case "RENDER_CATEGORY_GRID":
      return <CategoryGrid categories={viewState.data} />;
    
    case "RENDER_PRODUCT_LIST":
      return <ProductList products={viewState.data} />;
    
    case "RENDER_PRODUCT_DETAIL":
      return <ProductDetail product={viewState.data} />;;
      
    default:
      return <div className="p-10 text-red-500">Unknown view type: {viewState.type}</div>;
  }
}