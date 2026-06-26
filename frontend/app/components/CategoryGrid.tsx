export default function CategoryGrid({ categories }: { categories: any[] }) {
  return (
    <div className="p-8">
      <div className="border-b border-[#e0dcd3]/50 pb-4 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Browse Categories</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category, idx) => (
          <a
            key={idx}
            href={category.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-100/40 border border-[#d1ccbf]/50 rounded-xl shadow-sm hover:shadow-md hover:border-slate-500 hover:bg-[#f4f1ea] transition-all text-center flex items-center justify-center h-24 backdrop-blur-sm"
          >
            <span className="font-medium text-stone-700 text-sm">{category.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}