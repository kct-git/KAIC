import CategoryGrid from './CategoryGrid';
import ProductList from './ProductList';
import ProductDetail from './ProductDetail';
import DeliveryCitiesList from './DeliveryCitiesList';
import CheckDelivery from './CheckDelivery';
import CreateOrder from './CreateOrder';
import TrackOrder from './TrackOrder';
import CheckoutForm from './CheckoutForm';
import { motion, AnimatePresence } from 'framer-motion';

export default function DynamicRenderer({ viewState, onSendMessage, sessionId, onCartUpdated }: { viewState: any, onSendMessage?: (text: string) => void, sessionId?: string, onCartUpdated?: () => void }) {
  if (!viewState) {
    return (
      <AnimatePresence mode="wait">
        <motion.div 
          key="empty-state"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="h-full flex flex-col items-center justify-center text-center p-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100/30 flex items-center justify-center mb-6 border border-[#d1ccbf]/30 shadow-inner">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2l2 2h8a2 2 0 012 2v2M4 6v12a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </div>
          <p className="text-xl font-medium text-stone-700">Nothing to display yet</p>
          <p className="text-sm mt-3 text-slate-500 max-w-sm">Products, details, and forms will appear here as we chat.</p>
        </motion.div>
      </AnimatePresence>
    );
  }

  const renderContent = () => {
    switch (viewState.type) {
      case "RENDER_CATEGORY_GRID":
        return <CategoryGrid categories={viewState.data} />;
      
      case "RENDER_PRODUCT_LIST":
        return <ProductList products={viewState.data} onSendMessage={onSendMessage} />;
      
      case "RENDER_PRODUCT_DETAIL":
        return <ProductDetail product={viewState.data} onSendMessage={onSendMessage} sessionId={sessionId} onCartUpdated={onCartUpdated} />;

      case "RENDER_DELIVERY_CITIES_LIST":
        return <DeliveryCitiesList data={viewState.data} />;

      case "RENDER_CHECK_DELIVERY":
        return <CheckDelivery data={viewState.data} />;

      case "RENDER_CREATE_ORDER":
        return <CreateOrder data={viewState.data} />;
      
      case "RENDER_TRACK_ORDER":
        return <TrackOrder data={viewState.data} />;
        
      case "RENDER_CHECKOUT_FORM":
        return <CheckoutForm onSendMessage={onSendMessage} />;
        
      default:
        return <div className="p-10 text-red-400">Unknown view type: {viewState.type}</div>;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewState.type + (viewState.data?.id || '')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full h-full"
      >
        {renderContent()}
      </motion.div>
    </AnimatePresence>
  );
}