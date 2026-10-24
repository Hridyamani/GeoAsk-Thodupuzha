
import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  LayersControl,
  useMap,
} from 'react-leaflet';
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

function formatName(name) {
  return name
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function FitLayer({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features?.length) return;

    const boundsLayer = window.L.geoJSON(data);
    const bounds = boundsLayer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [25, 25], maxZoom: 15 });
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

  useEffect(() => {
    let cancelled = false;

    async function fetchLayers() {
      try {
        setLoading(true);
        setError('');

        const response = await axios.get(`${API_URL}/layers`);

        if (cancelled) return;

        const availableLayers = response.data.layers.filter(
          (layer) => !layer.error
        );

        setLayers(availableLayers);

        // Show the main map layers initially.
        const initiallyVisible = {};
        availableLayers.forEach((layer) => {
          initiallyVisible[layer.name] = [
            'education',
            'healthcare',
            'roads',
            'green_spaces',
          ].includes(layer.name);
        });

        setVisibleLayers(initiallyVisible);
      } catch (err) {
        if (!cancelled) {
          setError(
            'Could not load GIS layers. Check that the FastAPI backend is running.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLayers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchVisibleLayers() {
      const names = Object.keys(visibleLayers).filter(
        (name) => visibleLayers[name] && !layerData[name]
      );

      await Promise.all(
        names.map(async (name) => {
          try {
            const response = await axios.get(`${API_URL}/layers/${name}`);

            if (!cancelled) {
              setLayerData((previous) => ({
                ...previous,
                [name]: response.data,
              }));
            }
          } catch {
            if (!cancelled) {
              setError(`Could not load the ${formatName(name)} layer.`);
            }
          }
        })
      );
    }

    fetchVisibleLayers();

    return () => {
      cancelled = true;
    };
  }, [visibleLayers, layerData]);

  const toggleLayer = (name) => {
    setVisibleLayers((previous) => ({
      ...previous,
      [name]: !previous[name],
    }));
  };

  const toggleAll = (checked) => {
    setVisibleLayers(
      Object.fromEntries(layers.map((layer) => [layer.name, checked]))
    );
  };

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
        <aside className="w-64 shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            Map Layers
          </h2>

          {loading && (
            <p className="text-sm text-gray-500">Loading GIS layers...</p>
          )}

          {error && (
            <p className="mb-3 text-sm text-red-600">{error}</p>
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
                  <label
                    key={layer.name}
                    className="flex cursor-pointer items-start gap-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(visibleLayers[layer.name])}
                      onChange={() => toggleLayer(layer.name)}
                      className="mt-1 accent-green-600"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-gray-800">
                        {formatName(layer.name)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {layer.feature_count} features
                      </span>
                    </span>

                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                      style={{
                        backgroundColor:
                          layerColors[layer.name] || '#6b7280',
                      }}
                    />
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 border-t border-gray-100 pt-3">
            <p className="text-xs leading-5 text-gray-500">
              Layer data is fetched from your FastAPI backend as GeoJSON.
              Point, line and polygon features are displayed on the map.
            </p>
          </div>
        </aside>

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

              const color = layerColors[layer.name] || '#6b7280';

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
                    window.L.circleMarker(latlng, {
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
                        ([key, value]) =>
                          value !== null &&
                          value !== undefined &&
                          String(value).trim() !== ''
                      )
                      .slice(0, 8);

                    if (entries.length > 0) {
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
                    }
                  }}
                />
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
