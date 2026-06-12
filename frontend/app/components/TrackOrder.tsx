"use client";

interface TrackOrderProps {
  data: {
    order_number: string;
    pnref: string;
    status: string;
    status_display: string;
    order_date: string;
    delivery_date: string;
    shipped_date: string | null;
    amount: string;
    payment_method: string;
    comments: string | null;
    recipient: { name: string; phone: string; address: string; city: string };
    greeting_message: string | null;
    special_instructions: string | null;
    progress: { step: string; timestamp: string }[];
    live_tracking_available: boolean;
    has_delivery_video: boolean;
    has_delivery_photo: boolean;
    items: { product_id: string; name: string; quantity: number; selling_price: number }[];
  };
}

export default function TrackOrder({ data }: TrackOrderProps) {
  if (!data) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm my-6 flex flex-col gap-6">
      
      {/* Top Banner Status Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Order Tracking</h2>
          <p className="text-xs text-gray-400">Order No: {data.order_number} • Ref: {data.pnref}</p>
        </div>
        <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-xl text-center">
          <span className="text-xs text-green-600 block font-medium uppercase tracking-wider">Current Status</span>
          <span className="text-sm font-bold text-green-800">{data.status_display}</span>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      <div>
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Milestones</h3>
        <div className="relative pl-6 border-l-2 border-gray-100 space-y-4 ml-2">
          {data.progress.map((p, idx) => (
            <div key={idx} className="relative">
              {/* Dot */}
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-green-600 border-4 border-white shadow-sm" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{p.step}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Info Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-sm">
        <div>
          <span className="text-gray-400 block text-xs">Placed on</span>
          <span className="text-gray-800 font-medium">{data.order_date}</span>
        </div>
        <div>
          <span className="text-gray-400 block text-xs">Estimated Delivery</span>
          <span className="text-gray-800 font-medium text-green-700 font-bold">{data.delivery_date}</span>
        </div>
        <div>
          <span className="text-gray-400 block text-xs">Total Amount</span>
          <span className="text-gray-800 font-semibold">Rs. {parseFloat(data.amount).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-400 block text-xs">Payment Option</span>
          <span className="text-gray-800 font-medium">{data.payment_method}</span>
        </div>
      </div>

      {/* Recipient Information details box */}
      <div className="border border-gray-100 rounded-xl p-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">Delivery Destination</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p className="font-semibold text-gray-800">{data.recipient.name}</p>
          <p>{data.recipient.address}, {data.recipient.city}</p>
          <p className="text-xs text-gray-400 mt-1">📞 {data.recipient.phone}</p>
        </div>
      </div>

      {/* Custom Messages (Greetings & Special instructions) */}
      {(data.greeting_message || data.special_instructions) && (
        <div className="space-y-3">
          {data.greeting_message && (
            <div className="bg-green-50/40 border border-green-100/60 p-3.5 rounded-xl text-sm">
              <span className="text-xs font-bold text-green-900 block mb-1">✍️ Greeting Card Message</span>
              <p className="text-gray-700 italic">"{data.greeting_message}"</p>
            </div>
          )}
          {data.special_instructions && (
            <div className="bg-amber-50/40 border border-amber-100/60 p-3.5 rounded-xl text-sm">
              <span className="text-xs font-bold text-amber-950 block mb-1">📢 Special Instructions</span>
              <p className="text-amber-900/90">{data.special_instructions}</p>
            </div>
          )}
        </div>
      )}

      {/* Proof Media / Live Tracking Availability badges */}
      {(data.live_tracking_available || data.has_delivery_photo || data.has_delivery_video) && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {data.live_tracking_available && (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">
              🛰️ Live Rider Tracking Available
            </span>
          )}
          {data.has_delivery_photo && (
            <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-lg font-medium">
              📸 Delivery Photo Uploaded
            </span>
          )}
          {data.has_delivery_video && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-lg font-medium">
              🎥 Delivery Video Available
            </span>
          )}
        </div>
      )}

    </div>
  );
}