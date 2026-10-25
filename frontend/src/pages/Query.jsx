import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Query() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      localStorage.setItem('currentQuery', query);
      navigate('/processing');
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Enter Your Spatial Query</h2>
        <p className="text-gray-500 mb-6 text-sm">Ask a question about Thodupuzha Municipality in plain English.</p>
        
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="e.g., Show schools within 2 km of hospitals." 
            className="w-full border border-gray-300 rounded-lg p-4 mb-6 focus:ring-2 focus:ring-green-500 outline-none text-lg shadow-sm" 
            autoFocus
          />
          <button 
            type="submit" 
            className="bg-[#0f3d2e] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#185c46] transition-colors shadow-sm"
          >
            Submit Query
          </button>
        </form>
      </div>
    </div>
  );
}