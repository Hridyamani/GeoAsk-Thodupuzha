
import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bot } from 'lucide-react';

// Automatically fit the map around features, buffers, and markers.
function FitResults({ geojson, markers, buffers, center }) {
  const map = useMap();

  useEffect(() => {
    const bounds = [];

    // Include returned GeoJSON features.
    if (geojson?.features?.length) {
      const featureLayer = L.geoJSON(geojson);
      const featureBounds = featureLayer.getBounds();

      if (featureBounds.isValid()) {
        bounds.push(featureBounds);
      }
    }

    // Include buffer polygons in the map extent.
    if (Array.isArray(buffers)) {
      buffers.forEach((buffer) => {
        if (buffer?.type === 'Feature' && buffer.geometry) {
          const bufferLayer = L.geoJSON(buffer);
          const bufferBounds = bufferLayer.getBounds();

          if (bufferBounds.isValid()) {
            bounds.push(bufferBounds);
          }
        }
      });
    }

    // Include individual markers.
    if (Array.isArray(markers)) {
      markers.forEach((marker) => {
        if (
          Array.isArray(marker.pos) &&
          marker.pos.length === 2 &&
          marker.pos.every(
            (coordinate) =>
              typeof coordinate === 'number' &&
              Number.isFinite(coordinate)
          )
        ) {
          bounds.push(L.latLngBounds([marker.pos, marker.pos]));
        }
      });
    }

    // Fit all valid bounds together.
    if (bounds.length > 0) {
      const combinedBounds = bounds.reduce(
        (combined, current) => combined.extend(current)
      );

      if (combinedBounds.isValid()) {
        map.fitBounds(combinedBounds, {
          padding: [30, 30],
          maxZoom: 16,
        });
      } else if (center) {
        map.setView(center, 13);
      }
    } else if (center) {
      map.setView(center, 13);
    }
  }, [map, geojson, markers, buffers, center]);

  return null;
}

export default function Result() {
  const query =
    localStorage.getItem('currentQuery') || 'No query run yet.';

  // Read the latest query result when this page mounts.
  const result = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem('queryResult') || 'null'
      );
    } catch {
      return null;
    }
  }, []);

  // Extract the GeoJSON FeatureCollection from the API response.
  const geojson = useMemo(() => {
    if (!result) return null;

    const candidates = [
      result.geojson,
      result.features,
      result.map_data?.geojson,
      result.map_data?.features,
      result.data,
    ];

    for (const candidate of candidates) {
      if (
        candidate?.type === 'FeatureCollection' &&
        Array.isArray(candidate.features)
      ) {
        return candidate;
      }

      if (
        candidate?.type === 'Feature' &&
        candidate.geometry
      ) {
        return {
          type: 'FeatureCollection',
          features: [candidate],
        };
      }

      if (
        Array.isArray(candidate) &&
        candidate.every((item) => item?.type === 'Feature')
      ) {
        return {
          type: 'FeatureCollection',
          features: candidate,
        };
      }
    }

    return null;
  }, [result]);

  if (!result) {
    return (
      <div className="text-center mt-20 p-8 bg-white rounded-xl border">
        <h2 className="text-xl font-bold mb-4">
          No Result Found
        </h2>
        <p className="text-gray-600">
          Please run a query from the Geo Query page first.
        </p>
      </div>
    );
  }

  const mapData = result.map_data || {};
  const center = mapData.center || [9.895, 76.715];
  const buffers = Array.isArray(mapData.buffers)
    ? mapData.buffers
    : [];
  const markers = Array.isArray(mapData.markers)
    ? mapData.markers
    : [];
  const operations = Array.isArray(result.operations)
    ? result.operations
    : [];

  // Download the returned GeoJSON.
  const downloadGeoJSON = () => {
    if (!geojson) {
      alert(
        'The query response does not contain GeoJSON features. ' +
        'The backend must return the actual query result features.'
      );
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
      <h2 className="text-2xl font-bold mb-4">
        Query Result
      </h2>

      <p className="text-sm text-gray-500 mb-6">
        You asked:{' '}
        <span className="font-medium text-gray-800 italic">
          "{query}"
        </span>
      </p>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Query explanation and result information */}
        <div className="w-1/3 flex flex-col min-h-0 overflow-y-auto">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2 text-green-800 font-bold">
              <Bot size={20} />
              GeoAsk AI
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">
              {result.explanation ||
                'Your GIS query has been processed.'}
            </p>
          </div>

          <h3 className="font-bold mb-2 text-gray-800">
            Operations Executed
          </h3>

          <ul className="text-sm text-gray-600 mb-6 list-disc list-inside">
            {operations.length ? (
              operations.map((op, i) => (
                <li key={i}>
                  {typeof op === 'string'
                    ? op
                    : [
                        op?.type,
                        op?.target_layer
                          ? `Layer: ${op.target_layer}`
                          : null,
                        op?.reference_layer
                          ? `Reference: ${op.reference_layer}`
                          : null,
                        op?.distance_m !== null &&
                        op?.distance_m !== undefined
                          ? `Distance: ${op.distance_m} m`
                          : null,
                        op?.result_count !== undefined
                          ? `Results: ${op.result_count}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' — ') || 'GIS operation'}
                </li>
              ))
            ) : (
              <li>No operation details provided.</li>
            )}
          </ul>

          <p className="text-sm text-gray-600 mb-4">
            {geojson
              ? `${geojson.features.length} GeoJSON feature(s) returned`
              : 'No GeoJSON features were included in the API response.'}
          </p>

          <button
            onClick={downloadGeoJSON}
            className="bg-blue-600 text-white w-full py-2 rounded font-medium mt-auto hover:bg-blue-700"
          >
            Download Map Data (GeoJSON)
          </button>
        </div>

        {/* Interactive Leaflet map */}
        <div className="w-2/3 rounded-lg overflow-hidden border border-gray-200 relative">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Education and other returned features */}
            {geojson && (
              <GeoJSON
                key={JSON.stringify(geojson)}
                data={geojson}
                style={(feature) => {
                  const geometryType =
                    feature?.geometry?.type;

                  if (
                    geometryType === 'Polygon' ||
                    geometryType === 'MultiPolygon'
                  ) {
                    return {
                      color: '#2563eb',
                      weight: 2,
                      fillColor: '#60a5fa',
                      fillOpacity: 0.3,
                    };
                  }

                  if (
                    geometryType === 'LineString' ||
                    geometryType === 'MultiLineString'
                  ) {
                    return {
                      color: '#2563eb',
                      weight: 3,
                    };
                  }

                  return {
                    color: '#1d4ed8',
                    weight: 2,
                  };
                }}
                pointToLayer={(feature, latlng) =>
                  L.circleMarker(latlng, {
                    radius: 7,
                    color: '#1d4ed8',
                    weight: 2,
                    fillColor: '#60a5fa',
                    fillOpacity: 1,
                  })
                }
                onEachFeature={(feature, layer) => {
                  const properties =
                    feature.properties || {};

                  const label =
                    properties.name ||
                    properties.Name ||
                    properties.id ||
                    properties['@id'] ||
                    'GIS Feature';

                  layer.bindPopup(String(label));
                }}
              />
            )}

            {/* Red translucent proximity buffers */}
            {buffers.map((buffer, i) =>
              buffer?.type === 'Feature' &&
              buffer.geometry ? (
                <GeoJSON
                  key={`buffer-${i}`}
                  data={buffer}
                  style={{
                    color: '#ef4444',
                    weight: 2,
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                  }}
                />
              ) : null
            )}

            {/* Additional point markers */}
            {markers.map((marker, i) =>
              Array.isArray(marker.pos) &&
              marker.pos.length === 2 ? (
                <Marker
                  key={`marker-${i}`}
                  position={marker.pos}
                >
                  <Popup>
                    {marker.name ||
                      marker.type ||
                      'GIS Feature'}
                  </Popup>
                </Marker>
              ) : null
            )}

            {/* Zoom to features and buffers */}
            <FitResults
              geojson={geojson}
              markers={markers}
              buffers={buffers}
              center={center}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
