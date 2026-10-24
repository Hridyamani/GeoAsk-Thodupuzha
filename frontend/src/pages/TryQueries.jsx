import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function TryQueries() {
  const navigate = useNavigate();
  
  const queries = [
    "Show schools within 2km of hospitals.",
    "Find schools near Taluk Hospital.",
    "Which hospitals have schools nearby?"
  ];

  const handleClick = (q) => {
    localStorage.setItem('currentQuery', q);
    navigate('/processing');
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl border border-gray-200 shadow-sm mt-10">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Try a Spatial Query</h2>
      <p className="text-gray-500 mb-8">Click one of the examples below to see how GeoAsk processes plain English into GIS operations.</p>
      
      <div className="space-y-3">
        {queries.map((q, i) => (
          <button 
            key={i} 
            onClick={() => handleClick(q)} 
            className="w-full text-left bg-gray-50 hover:bg-green-50 p-4 rounded-lg border border-gray-200 flex items-center gap-4 transition-colors group"
          >
            <div className="bg-white p-2 rounded-md border border-gray-200 group-hover:border-green-300 text-gray-400 group-hover:text-green-600">
              <Search size={18} />
            </div>
            <span className="text-gray-700 font-medium">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}