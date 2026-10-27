
import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bot, Download } from 'lucide-react';

function FitResults({ geojson, buffers, markers, center }) {
  const map = useMap();

  useEffect(() => {
    const bounds = [];

    if (geojson?.features?.length) {
      const layer = L.geoJSON(geojson);
      if (layer.getLayers().length) {
        bounds.push(layer.getBounds());
      }
    }

    buffers?.forEach((buffer) => {
      if (buffer?.geometry) {
        const layer = L.geoJSON(buffer);
        if (layer.getLayers().length) {
          bounds.push(layer.getBounds());
        }
      } else if (
        Array.isArray(buffer?.center) &&
        Number.isFinite(buffer.radius)
      ) {
        const circle = L.circle(buffer.center, {
          radius: buffer.radius,
        });
        bounds.push(circle.getBounds());
      }
    });

    markers?.forEach((marker) => {
      if (
        Array.isArray(marker?.pos) &&
        marker.pos.length === 2 &&
        marker.pos.every(Number.isFinite)
      ) {
        bounds.push(L.latLngBounds([marker.pos, marker.pos]));
      }
    });

    if (bounds.length) {
      const combined = bounds.reduce((acc, bound) =>
        acc.extend(bound)
      );

      if (combined.isValid()) {
        map.fitBounds(combined, {
          padding: [30, 30],
          maxZoom: 16,
        });
      }
    } else if (Array.isArray(center)) {
      map.setView(center, 13);
    }

    setTimeout(() => map.invalidateSize(), 100);
  }, [map, geojson, buffers, markers, center]);

  return null;
}

export default function Result() {
  const query = localStorage.getItem('currentQuery') || 'No query run yet.';

  let result = null;

  try {
    result = JSON.parse(localStorage.getItem('queryResult'));
  } catch (error) {
    console.error('Could not parse query result:', error);
  }

  if (!result) {
    return (
      <div className="text-center mt-20 p-8 bg-white rounded-xl border border-gray-200 max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-2 text-gray-800">
          No Result Found
        </h2>
        <p className="text-gray-600">
          Please go to the Try Queries or Geo Query page to run a search first.
        </p>
      </div>
    );
  }

  const mapData = result.map_data || {};
  const geojson =
    mapData.geojson ||
    (mapData.type === 'FeatureCollection' ? mapData : null);

  const buffers = Array.isArray(mapData.buffers)
    ? mapData.buffers
    : [];

  const markers = Array.isArray(mapData.markers)
    ? mapData.markers
    : [];

  const operations = Array.isArray(result.operations)
    ? result.operations
    : [];

  const explanation = result.explanation || 'No explanation provided.';
  const center = Array.isArray(mapData.center)
    ? mapData.center
    : [9.895, 76.715];

  const downloadGeoJSON = () => {
    const exportData = geojson || {
      type: 'FeatureCollection',
      features: [],
    };

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: 'application/geo+json' }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'geoask_results.geojson';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 h-[85vh] min-h-0 flex flex-col shadow-sm">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">
        Analysis Results
      </h2>

      <p className="text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded">
        <span className="font-semibold text-gray-700">Query:</span>{' '}
        "{query}"
      </p>

      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="w-1/3 min-w-0 flex flex-col overflow-y-auto pr-2">
          <div className="bg-[#e8f5e9] border border-green-200 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3 text-[#0f3d2e] font-bold">
              <Bot size={20} />
              GeoAsk AI
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-medium">
              {explanation}
            </p>
          </div>

          <h3 className="font-bold mb-3 text-gray-800 text-sm uppercase tracking-wider">
            GIS Operations Executed
          </h3>

          <ul className="text-sm text-gray-600 mb-8 space-y-2">
            {operations.map((op, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-green-500 shrink-0" />
                <span>
                  {typeof op === 'string'
                    ? op
                    : `${op.type || 'GIS operation'}: ${op.result_count ?? ''} results`}
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={downloadGeoJSON}
            disabled={!geojson}
            className="mt-auto bg-[#0f3d2e] text-white w-full py-3 rounded-lg font-medium hover:bg-[#185c46] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={18} />
            Export Data
          </button>
        </div>

        <div className="w-2/3 min-w-0 min-h-0 rounded-xl overflow-hidden border border-gray-200 relative">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitResults
              geojson={geojson}
              buffers={buffers}
              markers={markers}
              center={center}
            />

            {geojson && (
              <GeoJSON
                key={JSON.stringify(geojson)}
                data={geojson}
                pointToLayer={(feature, latlng) =>
                  L.circleMarker(latlng, {
                    radius: 7,
                    color: '#1d4ed8',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.9,
                    weight: 2,
                  })
                }
                style={() => ({
                  color: '#2563eb',
                  weight: 3,
                  fillColor: '#60a5fa',
                  fillOpacity: 0.35,
                })}
                onEachFeature={(feature, layer) => {
                  const properties = feature.properties || {};
                  const content = Object.entries(properties)
                    .map(([key, value]) => `${key}: ${value ?? ''}`)
                    .join('<br/>');

                  if (content) {
                    layer.bindPopup(content);
                  }
                }}
              />
            )}

            {buffers.map((buffer, index) =>
              buffer?.geometry ? (
                <GeoJSON
                  key={`buffer-${index}`}
                  data={buffer}
                  style={{
                    color: '#ef4444',
                    weight: 2,
                    fillColor: '#ef4444',
                    fillOpacity: 0.12,
                  }}
                />
              ) : (
                Array.isArray(buffer?.center) &&
                Number.isFinite(buffer.radius) && (
                  <Circle
                    key={`buffer-${index}`}
                    center={buffer.center}
                    radius={buffer.radius}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.12,
                      weight: 2,
                    }}
                  />
                )
              )
            )}

            {markers.map((marker, index) =>
              Array.isArray(marker?.pos) ? (
                <Marker
                  key={`marker-${index}`}
                  position={marker.pos}
                >
                  <Popup>{marker.name || 'GIS feature'}</Popup>
                </Marker>
              ) : null
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
