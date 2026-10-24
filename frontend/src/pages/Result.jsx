import React from 'react';
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Bot, Download } from 'lucide-react';

export default function Result() {
  const query = localStorage.getItem('currentQuery') || "No query run yet.";
  let result = null;
  
  try {
    result = JSON.parse(localStorage.getItem('queryResult'));
  } catch (e) {}

  if (!result) {
    return (
      <div className="text-center mt-20 p-8 bg-white rounded-xl border border-gray-200 max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-2 text-gray-800">No Result Found</h2>
        <p className="text-gray-600">Please go to the "Try Queries" or "Geo Query" page to run a search first.</p>
      </div>
    );
  }

  const { map_data, explanation, operations } = result;

  // Function to actually download the map data as GeoJSON
  const downloadGeoJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(map_data.markers));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "geoask_results.geojson");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 h-[85vh] flex flex-col shadow-sm">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Analysis Results</h2>
      <p className="text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded inline-block">
        <span className="font-semibold text-gray-700">Query:</span> "{query}"
      </p>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Left Side: AI Explanation & Data */}
        <div className="w-1/3 flex flex-col overflow-y-auto pr-2">
          
          <div className="bg-[#e8f5e9] border border-green-200 rounded-xl p-5 mb-6 relative">
            <div className="flex items-center gap-2 mb-3 text-[#0f3d2e] font-bold">
              <Bot size={20} /> GeoAsk AI
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              {explanation}
            </p>
          </div>

          <h3 className="font-bold mb-3 text-gray-800 text-sm uppercase tracking-wider">GIS Operations Executed</h3>
          <ul className="text-sm text-gray-600 mb-8 space-y-2">
            {operations.map((op, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                {op}
              </li>
            ))}
          </ul>

          <button 
            onClick={downloadGeoJSON}
            className="mt-auto bg-[#0f3d2e] text-white w-full py-3 rounded-lg font-medium hover:bg-[#185c46] flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={18} /> Export Data
          </button>
        </div>

        {/* Right Side: Map */}
        <div className="w-2/3 rounded-xl overflow-hidden border border-gray-200 relative">
          <MapContainer center={map_data.center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {map_data.buffers.map((b, i) => (
              <Circle key={`buf-${i}`} center={b.center} radius={b.radius} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15, weight: 1 }} />
            ))}
            {map_data.markers.map((m, i) => (
               <Marker key={`mark-${i}`} position={m.pos} />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}