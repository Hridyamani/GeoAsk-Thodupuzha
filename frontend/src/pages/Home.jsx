import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Map, Download } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-5xl mx-auto mt-6">
      {/* Hero Section */}
      <div className="bg-[#0f3d2e] rounded-2xl p-12 mb-8 shadow-md">
        <h1 className="text-4xl font-bold text-white mb-4">Make smarter decisions with spatial insight.</h1>
        <p className="text-lg text-green-100 mb-8 max-w-2xl">
          Ask questions about Thodupuzha Municipality in plain English. Our RAG-LLM interface translates your natural language into complex GIS operations.
        </p>
        <button 
          onClick={() => navigate('/query')} 
          className="bg-green-400 text-[#0f3d2e] px-8 py-3 rounded-lg font-bold hover:bg-green-300 transition-colors shadow-sm"
        >
          Ask your question →
        </button>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#0f3d2e]">
            <MessageSquare size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Natural Language</h3>
          <p className="text-sm text-gray-600">No SQL or GIS software needed. Just type your spatial question like you would ask a human.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#0f3d2e]">
            <Map size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Interactive Maps</h3>
          <p className="text-sm text-gray-600">Instantly visualize spatial relationships with dynamic Leaflet maps and GeoPandas data.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#0f3d2e]">
            <Download size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Export Results</h3>
          <p className="text-sm text-gray-600">Download the generated GeoJSON data to use in QGIS, ArcGIS, or other mapping tools.</p>
        </div>
      </div>
    </div>
  );
}