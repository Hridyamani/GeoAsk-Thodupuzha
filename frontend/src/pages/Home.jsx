import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-[#e8f5e9] rounded-xl p-12 mb-8">
        <h1 className="text-4xl font-bold text-[#0f3d2e] mb-4">Make smarter decisions with spatial insight.</h1>
        <p className="text-lg text-gray-700 mb-8">Supporting smarter planning through spatial intelligence.</p>
        <button onClick={() => navigate('/query')} className="bg-[#0f3d2e] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#185c46]">Ask your question →</button>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {['Ask in plain language', 'Explore the map', 'Share clear results'].map((title, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            <p className="text-sm text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          </div>
        ))}
      </div>
    </div>
  );
}