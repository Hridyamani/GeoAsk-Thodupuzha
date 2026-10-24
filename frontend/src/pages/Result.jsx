
import React, { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Bot } from 'lucide-react';

export default function Result() {
  const query = localStorage.getItem('currentQuery') || 'No query run yet.';

  const result = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('queryResult') || 'null');
    } catch {
      return null;
    }
  }, []);

  if (!result) {
    return (
      <div className="text-center mt-20 p-8 bg-white rounded-xl border">
        <h2 className="text-xl font-bold mb-4">No Result Found</h2>
        <p className="text-gray-600">
          Please go to the Geo Query page and run a query first.
        </p>
      </div>
    );
  }

  const { map_data, explanation, operations = [] } = result;

  if (!map_data?.center) {
    return (
      <div className="text-center mt-20 p-8 bg-white rounded-xl border">
        <h2 className="text-xl font-bold mb-4">Map Data Unavailable</h2>
        <p className="text-gray-600">
          The query returned a result, but no valid map center was provided.
          Please run the query again.
        </p>
      </div>
    );
  }

  const buffers = map_data.buffers || [];
  const markers = map_data.markers || [];

  const downloadGeoJSON = () => {
    const geojson = result.geojson || result.map_data?.geojson;

    if (!geojson) {
      alert('GeoJSON data is not available in this query result.');
      return;
    }

    const blob = new Blob(
      [JSON.stringify(geojson, null, 2)],
      { type: 'application/geo+json' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'geoask-result.geojson';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 h-[85vh] flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Query Result</h2>

      <p className="text-sm text-gray-500 mb-6">
        You asked:{' '}
        <span className="font-medium text-gray-800 italic">
          "{query}"
        </span>
      </p>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Side: AI Response */}
        <div className="w-1/3 flex flex-col min-h-0 overflow-y-auto">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2 text-green-800 font-bold">
              <Bot size={20} />
              GeoAsk AI
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">
              {explanation || 'Your GIS query has been processed.'}
            </p>
          </div>

          <h3 className="font-bold mb-2 text-gray-800">
            Operations Executed
          </h3>

          
        <ul className="text-sm text-gray-600 mb-6 list-disc list-inside">
          {operations.length > 0 ? (
            operations.map((op, i) => (
            <li key={i}>
                {typeof op === 'string'
                  ? op
                  : typeof op === 'object' && op !== null
                  ? [
                        op.type,
                        op.target_layer
                        ? `Layer: ${op.target_layer}`
                          : null,
                          op.result_count !== undefined
                          ? `Results: ${op.result_count}`
                          : null,
                    ]
                    .filter(Boolean)
                    .join(' — ')
                    : String(op)}
              </li>
            ))
          ) : (
            <li>No operation details provided.</li>
            )}
        </ul>


          <button
            onClick={downloadGeoJSON}
            className="bg-blue-600 text-white w-full py-2 rounded font-medium mt-auto hover:bg-blue-700"
          >
            Download Map Data (GeoJSON)
          </button>
        </div>

        {/* Right Side: Map */}
        <div className="w-2/3 rounded-lg overflow-hidden border border-gray-200 relative">
          <MapContainer
            center={map_data.center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {buffers.map((b, i) => (
              <Circle
                key={`buf-${i}`}
                center={b.center}
                radius={b.radius}
                pathOptions={{
                  color: 'red',
                  fillColor: 'red',
                  fillOpacity: 0.1,
                }}
              />
            ))}

            {markers.map((m, i) => (
              <Marker
                key={`mark-${i}`}
                position={m.pos}
              >
                <Popup>
                  {m.name || m.type || 'GIS Feature'}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
