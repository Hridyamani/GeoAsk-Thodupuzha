import React from 'react';
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Bot, User, Download } from 'lucide-react';

export default function Result() {
  const query = localStorage.getItem('currentQuery') || "No query run yet.";
  let result = null;
  try { result = JSON.parse(localStorage.getItem('queryResult')); } catch (e) {}

  if (!result) return <div className="text-center mt-20 p-8">No result data found.</div>;

  const { map_data, explanation } = result;

  return (
    <div className="flex gap-6 h-[85vh]">
      {/* LEFT SIDE: Chat Interface */}
      <div className="w-[45%] bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Bot size={20} className="text-green-600"/> GeoAsk Assistant
          </h2>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          {/* User Message */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
              <User size={16} className="text-gray-600" />
            </div>
            <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none text-sm text-gray-800">
              {query}
            </div>
          </div>

          {/* AI Message */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-green-50 border border-green-100 p-3 rounded-lg rounded-tl-none text-sm text-gray-800 leading-relaxed">
              {explanation}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button className="w-full bg-[#0f3d2e] text-white py-2 rounded-lg font-medium hover:bg-[#185c46] flex items-center justify-center gap-2">
            <Download size={18} /> Export GeoJSON
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: Map */}
      <div className="w-[55%] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
        <MapContainer center={map_data.center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {map_data.buffers.map((b, i) => (
            <Circle key={`buf-${i}`} center={b.center} radius={b.radius} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1 }} />
          ))}
          {map_data.markers.map((m, i) => (
             <Marker key={`mark-${i}`} position={m.pos} />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}