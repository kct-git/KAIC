"use client";

interface CheckDeliveryProps {
  data: {
    city: string;
    now: string;
    checked_date: string;
    available: boolean;
    rate: number;
    currency: string;
    reason: string | null;
    next_available_date: string | null;
    perishable_warning: string | null;
  };
}

export default function CheckDelivery({ data }: CheckDeliveryProps) {
  if (!data) return null;

  return (
    <div className="p-6 max-w-xl mx-auto bg-white border border-gray-100 rounded-xl shadow-sm my-6">
      
      {/* Header Segment */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{data.city}</h2>
          <p className="text-xs text-gray-400">Checked on {data.checked_date}</p>
        </div>
        <div>
          {data.available ? (
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Available
            </span>
          ) : (
            <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Unavailable
            </span>
          )}
        </div>
      </div>

      {/* Main Availability Card Layout */}
      {data.available ? (
        <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-800 font-medium">Delivery Shipping Fee</span>
            <span className="text-xl font-extrabold text-green-700">
              Rs. {data.rate.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-green-600/90 leading-normal border-t border-green-100/50 pt-2">
            Standard flat shipping rate applied smoothly per order destination.
          </p>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col gap-2">
          <span className="text-sm font-semibold text-red-900">Delivery Restriction</span>
          <p className="text-xs text-red-700 leading-relaxed">
            {data.reason || "We are currently unable to ship to this location at this specific time."}
          </p>
          {data.next_available_date && (
            <p className="text-xs font-medium text-red-800 mt-1">
              📅 Next expected availability: <span className="underline">{data.next_available_date}</span>
            </p>
          )}
        </div>
      )}

      {/* Warning Alert for Fresh Cakes/Flowers */}
      {data.perishable_warning && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3 items-start">
          <span className="text-base select-none mt-0.5">⚠️</span>
          <div>
            <span className="text-xs font-bold text-amber-900 block">Perishable Item Handled</span>
            <span className="text-xs text-amber-700 mt-0.5 block leading-relaxed">
              {data.perishable_warning}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}