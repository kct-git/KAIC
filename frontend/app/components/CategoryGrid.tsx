export default function CategoryGrid({ categories }: { categories: any[] }) {
  return (
    <div className="p-8">
      <div className="border-b border-zinc-800/50 pb-4 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Browse Categories</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category, idx) => (
          <a
            key={idx}
            href={category.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-zinc-800/40 border border-zinc-700/50 rounded-xl shadow-sm hover:shadow-md hover:border-zinc-500 hover:bg-zinc-800 transition-all text-center flex items-center justify-center h-24 backdrop-blur-sm"
          >
            <span className="font-medium text-zinc-300 text-sm">{category.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}