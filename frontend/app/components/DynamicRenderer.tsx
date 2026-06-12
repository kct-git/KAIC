import CategoryGrid from './CategoryGrid';
import ProductList from './ProductList';
import ProductDetail from './ProductDetail';
import DeliveryCitiesList from './DeliveryCitiesList';
import CheckDelivery from './CheckDelivery';
import CreateOrder from './CreateOrder';
import TrackOrder from './TrackOrder';

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

    case "RENDER_DELIVERY_CITIES_LIST":
      return <DeliveryCitiesList data={viewState.data} />;

    case "RENDER_CHECK_DELIVERY":
      return <CheckDelivery data={viewState.data} />;

    case "RENDER_CREATE_ORDER":
      return <CreateOrder data={viewState.data} />;
    
    case "RENDER_TRACK_ORDER":
      return <TrackOrder data={viewState.data} />;
      
    default:
      return <div className="p-10 text-red-500">Unknown view type: {viewState.type}</div>;
  }
}