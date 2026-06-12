"use client";

interface CreateOrderProps {
  data: {
    checkout_url: string;
    order_ref: string;
    summary: {
      items_total: number;
      delivery_fee: number;
      addons_total: number;
      grand_total: number;
      currency: string;
    };
    expires_at: string;
  };
}

export default function CreateOrder({ data }: CreateOrderProps) {
  if (!data) return null;

  const { summary } = data;
  const formattedExpiry = new Date(data.expires_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="p-6 max-w-md mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm my-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-100">
        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold mb-2">
          ✓
        </div>
        <h2 className="text-lg font-bold text-gray-900">Order Draft Created</h2>
        <p className="text-xs text-gray-400 mt-0.5">Reference: {data.order_ref}</p>
      </div>

      {/* Pricing Summary Breakdown */}
      <div className="py-4 space-y-2.5 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Items Total</span>
          <span>Rs. {summary.items_total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Delivery Fee</span>
          <span>Rs. {summary.delivery_fee.toLocaleString()}</span>
        </div>
        {summary.addons_total > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Add-ons / Wrapping</span>
            <span>Rs. {summary.addons_total.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-dashed border-gray-200">
          <span>Grand Total</span>
          <span className="text-green-700">
            Rs. {summary.grand_total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Expiration Notice Banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center text-xs text-amber-800 mb-4">
        ⏰ Secure payment link expires at <span className="font-bold">{formattedExpiry}</span> today.
      </div>

      {/* Secure Checkout Button Redirect */}
      <a
        href={data.checkout_url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-green-600 text-white h-12 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        <span>Proceed to Secure Payment</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}