
import React, { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bot, Download, MapPin, Layers, AlertCircle } from 'lucide-react';

const layerColors = {
  education: '#2563eb',
  healthcare: '#dc2626',
  pharmacies: '#9333ea',
  food_services: '#ea580c',
  green_spaces: '#16a34a',
  buildings: '#64748b',
  landuse: '#a16207',
  roads: '#475569',
  shops: '#db2777',
  transport: '#0891b2',
  waterways: '#0284c7',
};

function formatName(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function FitResults({ geojson }) {
  const map = useMap();

  React.useEffect(() => {
    if (!geojson?.features?.length) return;

    const layer = L.geoJSON(geojson);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 15,
      });
    }
  }, [geojson, map]);

  return null;
}

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
      <div className="mt-20 rounded-xl border bg-white p-8 text-center">
        <h2 className="mb-4 text-xl font-bold">No Result Found</h2>
        <p className="text-gray-600">
          Go to Geo Query and run a query first.
        </p>
      </div>
    );
  }

  const { map_data = {}, explanation, operations = [] } = result;
  const geojson = map_data.geojson;
  const featureCount = geojson?.features?.length ?? 0;
  const layerName = map_data.layer || operations[0]?.target_layer || '';
  const color = map_data.color || layerColors[layerName] || '#2563eb';

  const downloadGeoJSON = () => {
    if (!geojson) {
      alert('No GeoJSON data is available to download.');
      return;
    }

    const blob = new Blob(
      [JSON.stringify(geojson, null, 2)],
      { type: 'application/geo+json' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'geoask-query-results.geojson';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[85vh] min-h-[500px] flex-col rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-2 text-2xl font-bold">Query Result</h2>

      <p className="mb-4 break-words text-sm text-gray-500">
        You asked:{' '}
        <span className="font-medium italic text-gray-800">
          "{query}"
        </span>
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <MapPin size={16} />
          <span>{featureCount} matching features</span>
        </div>

        {layerName && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
            <Layers size={16} />
            <span>{formatName(layerName)}</span>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 md:flex-row">
        <section className="flex w-full flex-col md:w-1/3">
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-green-800">
              <Bot size={20} />
              GeoAsk AI
            </div>

            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">
              {explanation || 'The query has been processed.'}
            </p>
          </div>

          <h3 className="mb-2 font-bold text-gray-800">
            Operations Executed
          </h3>

          {operations.length > 0 ? (
            <ul className="mb-5 space-y-2 text-sm text-gray-600">
              {operations.map((operation, index) => (
                <li
                  key={index}
                  className="rounded-lg bg-gray-50 p-3"
                >
                  <p className="font-medium text-gray-800">
                    {formatName(operation.type)}
                  </p>

                  {operation.target_layer && (
                    <p>Layer: {formatName(operation.target_layer)}</p>
                  )}

                  {operation.reference_layer && (
                    <p>
                      Reference: {formatName(operation.reference_layer)}
                    </p>
                  )}

                  {operation.distance_m != null && (
                    <p>Distance: {operation.distance_m} metres</p>
                  )}

                  {operation.result_count != null && (
                    <p>Results: {operation.result_count}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-5 text-sm text-gray-500">
              No operation details were returned.
            </p>
          )}

          {!geojson && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle size={18} className="shrink-0" />
              No GeoJSON data was returned for this query.
            </div>
          )}

          <button
            type="button"
            onClick={downloadGeoJSON}
            disabled={!geojson}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={18} />
            Download Map Data (GeoJSON)
          </button>
        </section>

        <section className="min-h-[350px] w-full overflow-hidden rounded-lg border border-gray-200 md:w-2/3">
          <MapContainer
            center={map_data.center || [9.895, 76.715]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geojson && <FitResults geojson={geojson} />}

            {geojson && (
              <GeoJSON
                key={`${layerName}-${featureCount}`}
                data={geojson}
                style={() => ({
                  color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.3,
                })}
                pointToLayer={(_feature, latlng) =>
                  L.circleMarker(latlng, {
                    radius: 7,
                    color,
                    fillColor: color,
                    fillOpacity: 0.9,
                    weight: 2,
                  })
                }
                onEachFeature={(feature, leafletLayer) => {
                  const properties = feature.properties || {};
                  const entries = Object.entries(properties)
                    .filter(
                      ([, value]) =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ''
                    )
                    .slice(0, 10);

                  const popup = document.createElement('div');

                  const title = document.createElement('strong');
                  title.textContent =
                    properties.name ||
                    properties.NAME ||
                    formatName(layerName) ||
                    'GIS Feature';

                  popup.appendChild(title);

                  entries.forEach(([key, value]) => {
                    const line = document.createElement('div');
                    line.textContent = `${formatName(key)}: ${String(value)}`;
                    popup.appendChild(line);
                  });

                  leafletLayer.bindPopup(popup);
                }}
              />
            )}

            {(map_data.buffers || []).map((buffer, index) => {
              if (buffer.geometry) {
                return (
                  <GeoJSON
                    key={`buffer-${index}`}
                    data={buffer}
                    style={{
                      color: '#dc2626',
                      fillColor: '#dc2626',
                      fillOpacity: 0.12,
                      weight: 2,
                    }}
                  />
                );
              }

              if (buffer.center && buffer.radius) {
                return (
                  <Circle
                    key={`buffer-${index}`}
                    center={buffer.center}
                    radius={buffer.radius}
                    pathOptions={{
                      color: '#dc2626',
                      fillColor: '#dc2626',
                      fillOpacity: 0.12,
                    }}
                  />
                );
              }

              return null;
            })}

            {(map_data.markers || []).map((marker, index) => (
              <Marker key={`marker-${index}`} position={marker.pos}>
                <Popup>{marker.name || 'GIS Feature'}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>
      </div>
    </div>
  );
}
