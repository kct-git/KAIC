export default function CategoryGrid({ categories }: { categories: any[] }) {
  return (
    <div className="p-8">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Browse Categories</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category, idx) => (
          <a
            key={idx}
            href={category.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-500 transition-all text-center flex items-center justify-center h-24"
          >
            <span className="font-semibold text-gray-700 text-sm">{category.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}