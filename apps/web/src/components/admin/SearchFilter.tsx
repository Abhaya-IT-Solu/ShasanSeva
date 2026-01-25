'use client';

interface SearchFilterProps {
    search: string;
    onSearchChange: (value: string) => void;
    placeholder?: string;
    filters?: React.ReactNode;
}

export function SearchFilter({
    search,
    onSearchChange,
    placeholder = 'Search...',
    filters
}: SearchFilterProps) {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        🔍
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                    />
                </div>
                {filters && (
                    <div className="flex items-center gap-3">
                        {filters}
                    </div>
                )}
            </div>
        </div>
    );
}
