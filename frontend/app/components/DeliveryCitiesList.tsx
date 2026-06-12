"use client";

interface City {
  name: string;
  aliases: string[];
}

interface DeliveryCitiesListProps {
  data: {
    cities: City[];
    total_matched: number;
    showing: number;
  };
}

export default function DeliveryCitiesList({ data }: DeliveryCitiesListProps) {
  if (!data) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Supported Delivery Locations</h2>
          <p className="text-xs text-gray-500 mt-1">Verifying operational coverage across regions</p>
        </div>
        <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 self-start sm:self-center">
          Showing {data.showing} of {data.total_matched} matched
        </div>
      </div>

      {data.cities && data.cities.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.cities.map((city, idx) => (
            <div 
              key={idx} 
              className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col justify-center min-h-[72px] transition-all hover:border-green-500 hover:shadow-md"
            >
              <span className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                {city.name}
              </span>
              {city.aliases && city.aliases.length > 0 && (
                <span className="text-xs text-gray-400 mt-1 pl-3.5">
                  Known as: {city.aliases.join(", ")}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800 text-sm">
          No delivery cities matched your search query. Try typing another city name.
        </div>
      )}
    </div>
  );
}