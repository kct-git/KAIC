import CategoryGrid from './CategoryGrid';
import ProductList from './ProductList';

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
      return (
        <div className="p-10">
           <h2 className="text-2xl font-bold">Single Product View</h2>
           <pre className="mt-4 bg-gray-200 p-4 rounded text-sm overflow-auto">
             {JSON.stringify(viewState.data, null, 2)}
           </pre>
        </div>
      );
      
    default:
      return <div className="p-10 text-red-500">Unknown view type: {viewState.type}</div>;
  }
}