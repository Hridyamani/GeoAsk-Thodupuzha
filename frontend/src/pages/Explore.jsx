import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';

export default function Explore() {
  return (
    <div className="flex h-[85vh] gap-4">
      <div className="w-1/4 bg-white p-4 rounded-xl border border-gray-200 overflow-y-auto">
        <h2 className="font-bold text-lg mb-4">Layers</h2>
        {['Municipal Boundary', 'Wards', 'Schools', 'Hospitals', 'Buildings', 'Roads', 'Rivers'].map(l => (
          <label key={l} className="flex items-center gap-3 mb-3 text-sm">
            <input type="checkbox" defaultChecked className="rounded text-green-600" /> {l}
          </label>
        ))}
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200">
        <MapContainer center={[9.895, 76.715]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
      </div>
    </div>
  );
}