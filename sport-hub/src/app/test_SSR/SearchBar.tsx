'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
  currentQuery: string;
}

export default function SearchBar({ onSearch, onClear, isSearching, currentQuery }: SearchBarProps) {
  const [searchInput, setSearchInput] = useState(currentQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput('');
    onClear();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          Search
        </button>
        {currentQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </form>
      {currentQuery && (
        <p className="mt-2 text-sm text-gray-600">
          Searching for: <span className="font-medium">&quot;{currentQuery}&quot;</span>
        </p>
      )}
    </div>
  );
}
