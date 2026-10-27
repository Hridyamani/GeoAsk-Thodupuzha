
import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const API_URL = 'http://127.0.0.1:8000/api';

const layerColors = {
  buildings: '#64748b',
  education: '#2563eb',
  food_services: '#ea580c',
  green_spaces: '#16a34a',
  healthcare: '#dc2626',
  landuse: '#a16207',
  pharmacies: '#9333ea',
  roads: '#475569',
  shops: '#db2777',
  transport: '#0891b2',
  waterways: '#0284c7',
};

const initiallyVisibleNames = [
  'education',
  'healthcare',
  'roads',
  'green_spaces',
];

function formatName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    return 'Unknown layer';
  }

  return name
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function FitLayer({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features?.length) return;

    try {
      const boundsLayer = L.geoJSON(data);
      const bounds = boundsLayer.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [25, 25],
          maxZoom: 15,
        });
      }
    } catch (error) {
      console.error('Could not calculate map bounds:', error);
    }
  }, [data, map]);

  return null;
}

export default function Explore() {
  const [layers, setLayers] = useState([]);
  const [visibleLayers, setVisibleLayers] = useState({});
  const [layerData, setLayerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [failedLayers, setFailedLayers] = useState({});

  // Load available GIS layers from FastAPI.
  useEffect(() => {
    let cancelled = false;

    async function fetchLayers() {
      try {
        setLoading(true);
        setError('');

        const response = await axios.get(`${API_URL}/layers`);
        if (cancelled) return;

        const rawLayers = response.data?.layers;

        if (!Array.isArray(rawLayers)) {
          throw new Error('Invalid GIS layers response.');
        }

        // Support both [{ name, feature_count }] and ["buildings", ...].
        const normalizedLayers = rawLayers
          .map((layer) => {
            if (typeof layer === 'string') {
              return {
                name: layer,
                feature_count: null,
              };
            }

            if (layer && typeof layer.name === 'string') {
              return {
                ...layer,
                feature_count: Number(layer.feature_count ?? 0),
              };
            }

            return null;
          })
          .filter(
            (layer) =>
              layer &&
              layer.name.trim() !== '' &&
              !layer.error
          );

        setLayers(normalizedLayers);

        const initialVisibility = {};

        normalizedLayers.forEach((layer) => {
          initialVisibility[layer.name] =
            initiallyVisibleNames.includes(layer.name);
        });

        setVisibleLayers(initialVisibility);
      } catch (err) {
        console.error('Error loading GIS layers:', err);

        if (!cancelled) {
          setError(
            'Could not load GIS layers. Check that the FastAPI backend is running at http://127.0.0.1:8000.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLayers();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch GeoJSON only for layers that are currently visible.
  useEffect(() => {
    let cancelled = false;

    async function fetchVisibleLayers() {
      const names = Object.keys(visibleLayers).filter(
        (name) =>
          visibleLayers[name] &&
          !Object.prototype.hasOwnProperty.call(layerData, name) &&
          !failedLayers[name]
      );

      await Promise.all(
        names.map(async (name) => {
          try {
            const response = await axios.get(
              `${API_URL}/layers/${encodeURIComponent(name)}`
            );

            if (cancelled) return;

            const geojson = response.data;

            if (
              !geojson ||
              geojson.type !== 'FeatureCollection' ||
              !Array.isArray(geojson.features)
            ) {
              throw new Error('Backend did not return valid GeoJSON.');
            }

            setLayerData((previous) => ({
              ...previous,
              [name]: geojson,
            }));

            setFailedLayers((previous) => ({
              ...previous,
              [name]: false,
            }));
          } catch (err) {
            console.error(`Error loading layer "${name}":`, err);

            if (!cancelled) {
              setFailedLayers((previous) => ({
                ...previous,
                [name]: true,
              }));

              setError(
                `Could not load the ${formatName(name)} layer. Check the backend endpoint.`
              );
            }
          }
        })
      );
    }

    fetchVisibleLayers();

    return () => {
      cancelled = true;
    };
  }, [visibleLayers, layerData, failedLayers]);

  function toggleLayer(name) {
    setVisibleLayers((previous) => ({
      ...previous,
      [name]: !previous[name],
    }));
  }

  function toggleAll(checked) {
    setVisibleLayers(
      Object.fromEntries(
        layers.map((layer) => [layer.name, checked])
      )
    );
  }

  function retryLayer(name) {
    setError('');

    setFailedLayers((previous) => ({
      ...previous,
      [name]: false,
    }));

    setVisibleLayers((previous) => ({
      ...previous,
      [name]: false,
    }));

    // Re-enable the layer after clearing its previous failure.
    setTimeout(() => {
      setVisibleLayers((previous) => ({
        ...previous,
        [name]: true,
      }));
    }, 0);
  }

  const hasVisibleLayers = Object.values(visibleLayers).some(Boolean);

  return (
    <div className="flex h-[85vh] min-h-[500px] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Explore GIS Map
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Explore real Thodupuzha GIS data by switching map layers on and off.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Layer control panel */}
        <aside className="w-64 shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            Map Layers
          </h2>

          {loading && (
            <p className="text-sm text-gray-500">
              Loading GIS layers...
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {!loading && layers.length === 0 && !error && (
            <p className="text-sm text-gray-500">
              No GIS layers are available.
            </p>
          )}

          {!loading && layers.length > 0 && (
            <>
              <div className="mb-3 flex gap-3 border-b border-gray-100 pb-3 text-sm">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="text-green-700 hover:underline"
                >
                  Show all
                </button>

                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="text-gray-600 hover:underline"
                >
                  Hide all
                </button>
              </div>

              <div className="space-y-4">
                {layers.map((layer) => (
                  <div
                    key={layer.name}
                    className="flex items-start gap-3 text-sm"
                  >
                    <input
                      id={`layer-${layer.name}`}
                      type="checkbox"
                      checked={Boolean(visibleLayers[layer.name])}
                      onChange={() => toggleLayer(layer.name)}
                      className="mt-1 accent-green-600"
                    />

                    <label
                      htmlFor={`layer-${layer.name}`}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="block font-medium text-gray-800">
                        {formatName(layer.name)}
                      </span>

                      <span className="text-xs text-gray-500">
                        {layer.feature_count === null
                          ? 'Feature count unavailable'
                          : `${layer.feature_count} features`}
                      </span>

                      {failedLayers[layer.name] && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            retryLayer(layer.name);
                          }}
                          className="mt-1 block text-xs text-blue-700 hover:underline"
                        >
                          Retry loading
                        </button>
                      )}
                    </label>

                    <span
                      aria-hidden="true"
                      className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                      style={{
                        backgroundColor:
                          layerColors[layer.name] || '#6b7280',
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 border-t border-gray-100 pt-3">
            <p className="text-xs leading-5 text-gray-500">
              Layer data is fetched from FastAPI as GeoJSON. Point, line,
              and polygon features are displayed on the map.
            </p>
          </div>
        </aside>

        {/* Map */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
          <MapContainer
            center={[9.895, 76.715]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {layers.map((layer) => {
              if (!visibleLayers[layer.name]) return null;

              const data = layerData[layer.name];

              if (!data) return null;

              const color =
                layerColors[layer.name] || '#6b7280';

              return (
                <GeoJSON
                  key={layer.name}
                  data={data}
                  style={() => ({
                    color,
                    weight:
                      layer.name === 'roads' ||
                      layer.name === 'waterways'
                        ? 2
                        : 1,
                    fillColor: color,
                    fillOpacity: 0.25,
                  })}
                  pointToLayer={(_feature, latlng) =>
                    L.circleMarker(latlng, {
                      radius: 6,
                      color,
                      fillColor: color,
                      fillOpacity: 0.85,
                      weight: 1,
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
                      .slice(0, 8);

                    if (entries.length === 0) return;

                    const content = document.createElement('div');

                    const heading = document.createElement('strong');
                    heading.textContent = formatName(layer.name);
                    content.appendChild(heading);

                    entries.forEach(([key, value]) => {
                      const line = document.createElement('div');
                      const label = document.createElement('strong');

                      label.textContent = `${formatName(key)}: `;

                      line.appendChild(label);
                      line.appendChild(
                        document.createTextNode(String(value))
                      );

                      content.appendChild(line);
                    });

                    leafletLayer.bindPopup(content);
                  }}
                />
              );
            })}

            {hasVisibleLayers &&
              Object.keys(visibleLayers).some(
                (name) => visibleLayers[name] && layerData[name]
              ) && (
                <FitLayer
                  data={{
                    type: 'FeatureCollection',
                    features: Object.keys(visibleLayers)
                      .filter(
                        (name) =>
                          visibleLayers[name] && layerData[name]
                      )
                      .flatMap(
                        (name) => layerData[name].features
                      ),
                  }}
                />
              )}
          </MapContainer>

          {!loading && layers.length > 0 && !hasVisibleLayers && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-lg bg-white px-4 py-2 text-sm text-gray-700 shadow">
              Select a layer to display GIS features.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
