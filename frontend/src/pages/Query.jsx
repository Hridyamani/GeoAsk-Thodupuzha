
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const exampleQueries = [
  'Show all schools',
  'Show all hospitals',
  'Find schools within 500 metres of hospitals',
  'Show all pharmacies',
  'List roads in Thodupuzha',
];

export default function Query() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) return;

    localStorage.setItem('currentQuery', trimmedQuery);
    localStorage.removeItem('queryResult');

    navigate('/processing');
  };

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">
        Enter Your Spatial Query
      </h2>

      <p className="mb-6 text-sm text-gray-500">
        Ask a question about the available GIS data in Thodupuzha.
      </p>

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="spatial-query"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Your question
        </label>

        <textarea
          id="spatial-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Find schools within 500 metres of hospitals"
          rows={3}
          className="mb-4 w-full resize-y rounded-lg border border-gray-300 p-4 outline-none focus:ring-2 focus:ring-green-500"
          required
        />

        <button
          type="submit"
          disabled={!query.trim()}
          className="mb-8 rounded-lg bg-[#0f3d2e] px-8 py-3 font-medium text-white hover:bg-[#185c46] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit Query
        </button>
      </form>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-700">
          Example Queries
        </h4>

        {exampleQueries.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setQuery(example)}
            className="mb-2 block w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-left text-sm text-gray-600 hover:bg-gray-100"
          >
            {example}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Note: Spatial operations depend on the query types currently
        implemented in the backend.
      </p>
    </div>
  );
}
