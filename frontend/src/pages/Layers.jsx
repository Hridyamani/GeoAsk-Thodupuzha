import React from 'react';
import { Eye } from 'lucide-react';

export default function Layers() {
  const layers = ['Municipal Boundary', 'Wards', 'Schools', 'Hospitals', 'Buildings', 'Roads', 'Rivers', 'Land Use'];
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200">
      <h2 className="text-2xl font-bold mb-8">Pick the layers you want to explore.</h2>
      <div className="grid grid-cols-2 gap-4">
        {layers.map((l, i) => (
          <div key={i} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium">{l}</h4>
              <p className="text-xs text-gray-500">Visible on map</p>
            </div>
            <Eye size={18} className="text-gray-400" />
          </div>
        ))}
      </div>
    </div>
  );
}