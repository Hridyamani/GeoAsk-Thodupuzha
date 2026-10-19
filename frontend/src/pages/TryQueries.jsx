import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TryQueries() {
  const navigate = useNavigate();
  const categories = [
    { title: 'Public services', items: ['Find schools within 2 km of hospitals.', 'Which wards have the fewest schools?'] },
    { title: 'Environment & risk', items: ['Find buildings in the flood zone.', 'Show settlements near rivers.'] },
    { title: 'Mobility & infrastructure', items: ['Find bus stops more than 500 m from schools.'] },
  ];

  const handleClick = (q) => {
    localStorage.setItem('currentQuery', q);
    navigate('/processing');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-8">Start with a spatial question.</h2>
      <div className="grid grid-cols-3 gap-6">
        {categories.map((cat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold mb-4">{cat.title}</h3>
            {cat.items.map((ex, j) => (
              <button key={j} onClick={() => handleClick(ex)} className="block w-full text-left bg-gray-50 p-3 rounded text-sm text-gray-700 mb-2 hover:bg-green-50">{ex}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}