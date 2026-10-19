import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Query() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Save query to local storage to pass to processing/result pages
      localStorage.setItem('currentQuery', query);
      navigate('/processing');
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">Enter Your Spatial Query</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., Show schools within 2 km of hospitals." className="w-full border border-gray-300 rounded-lg p-4 mb-6 focus:ring-2 focus:ring-green-500 outline-none" />
        <button type="submit" className="bg-[#0f3d2e] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#185c46] mb-8">Submit Query</button>
      </form>
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Example Queries</h4>
        {['Show schools within 2 km of hospitals.', 'Find buildings inside the flood zone.', 'List villages intersecting the river.'].map((ex, i) => (
          <button key={i} onClick={() => setQuery(ex)} className="block w-full text-left bg-gray-50 hover:bg-gray-100 p-3 rounded border border-gray-200 text-sm text-gray-600 mb-2">{ex}</button>
        ))}
      </div>
    </div>
  );
}