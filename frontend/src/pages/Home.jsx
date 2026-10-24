import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Map, Download } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-[#0f3d2e] to-[#185c46] rounded-2xl p-12 mb-8 shadow-md">
        <h1 className="text-4xl font-bold text-white mb-4">Make smarter decisions with spatial insight.</h1>
        <p className="text-lg text-green-100 mb-8 max-w-2xl">Ask questions about Thodupuzha Municipality in plain English. Our AI translates your query into complex GIS operations.</p>
        <button 
          onClick={() => navigate('/query')} 
          className="bg-green-400 text-[#0f3d2e] px-8 py-3 rounded-lg font-bold hover:bg-green-300 transition-colors shadow-sm"
        >
          Ask your question →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#0f3d2e]">
            <MessageSquare size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Plain Language</h3>
          <p className="text-sm text-gray-600">No SQL or GIS software needed. Just type "Show schools within 2km of hospitals."</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#0f3d2e]">
            <Map size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Interactive Maps</h3>
          <p className="text-sm text-gray-600">Instantly visualize spatial relationships with dynamic Leaflet maps.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-[#0f3d2e]">
            <Download size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Export Results</h3>
          <p className="text-sm text-gray-600">Download the generated GeoJSON data to use in QGIS or ArcGIS.</p>
        </div>
      </div>
    </div>
  );
}