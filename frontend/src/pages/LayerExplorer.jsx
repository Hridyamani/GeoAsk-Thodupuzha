
import { useEffect, useState } from "react";
import axios from "axios";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_URL = "http://127.0.0.1:8000";
const PAGE_SIZE = 10;

const formatName = (name) =>
  name.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Automatically zoom to the currently displayed GeoJSON features.
function FitLayer({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.features?.length) return;

    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 16,
      });
    }
  }, [data, map]);

  return null;
}

export default function LayerExplorer() {
  const [layers, setLayers] = useState([]);
  const [selected, setSelected] = useState("");
  const [geojson, setGeojson] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");

  // Load available GIS layers.
  useEffect(() => {
    async function fetchLayers() {
      try {
        setError("");

        const response = await axios.get(`${API_URL}/api/layers`);
        const items = response.data.layers ?? [];

        setLayers(items);

        if (items.length > 0) {
          setSelected(items[0].name);
        }
      } catch (err) {
        setError(
          "Could not load GIS layers. Please check that the backend is running."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchLayers();
  }, []);

  // Load the selected layer's GeoJSON.
  useEffect(() => {
    if (!selected) return;

    let cancelled = false;

    async function fetchFeatures() {
      try {
        setLoadingFeatures(true);
        setError("");
        setGeojson(null);
        setPage(0);
        setSearchTerm("");
        setFilterColumn("");
        setFilterValue("");

        const response = await axios.get(
          `${API_URL}/api/layers/${encodeURIComponent(selected)}`
        );

        const data = response.data;
        const result = data.geojson ?? data;

        if (!cancelled) {
          if (result?.type === "FeatureCollection" &&
              Array.isArray(result.features)) {
            setGeojson(result);
          } else {
            setGeojson(null);
            setError(
              `The ${selected} endpoint did not return a valid GeoJSON FeatureCollection.`
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setGeojson(null);
          setError(`Could not load features for ${selected}.`);
        }
      } finally {
        if (!cancelled) {
          setLoadingFeatures(false);
        }
      }
    }

    fetchFeatures();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const layerInfo = layers.find((layer) => layer.name === selected);
  const features = geojson?.features ?? [];

  // Get all available attribute columns across the selected layer.
  const properties = [
    ...new Set(
      features.flatMap((feature) =>
        Object.keys(feature.properties ?? {})
      )
    ),
  ];

  // Apply the selected-column filter first.
  const attributeFilteredFeatures = features.filter((feature) => {
    if (!filterColumn || !filterValue.trim()) {
      return true;
    }

    const value = String(
      feature.properties?.[filterColumn] ?? ""
    ).toLowerCase();

    return value.includes(filterValue.trim().toLowerCase());
  });

  // Then apply the search across all attributes.
  const filteredFeatures = attributeFilteredFeatures.filter((feature) => {
    const searchableText = Object.values(feature.properties ?? {})
      .map((value) => String(value ?? ""))
      .join(" ")
      .toLowerCase();

    return searchableText.includes(searchTerm.trim().toLowerCase());
  });

  // Use the same filtered features for the map and table.
  const filteredGeoJSON = geojson
    ? {
        ...geojson,
        features: filteredFeatures,
      }
    : null;

  const pageCount = Math.ceil(filteredFeatures.length / PAGE_SIZE);

  const visibleFeatures = filteredFeatures.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  // Export all matching records, not only the current table page.
  const exportCSV = () => {
    if (filteredFeatures.length === 0) {
      alert("No matching features available to export.");
      return;
    }

    const escapeCSV = (value) => {
      const text =
        value !== null && typeof value === "object"
          ? JSON.stringify(value)
          : String(value ?? "");

      // Protect CSV values containing commas, quotes, or newlines.
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = [
      ["Feature", ...properties].map(escapeCSV).join(","),
      ...filteredFeatures.map((feature, index) =>
        [
          index + 1,
          ...properties.map(
            (column) => feature.properties?.[column]
          ),
        ]
          .map(escapeCSV)
          .join(",")
      ),
    ];

    const blob = new Blob(
      ["\uFEFF" + rows.join("\r\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${selected}_attributes.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterColumn("");
    setFilterValue("");
    setPage(0);
  };

  return (
    <main
      style={{
        padding: 24,
        color: "#172033",
        maxWidth: 1600,
        margin: "0 auto",
      }}
    >
      <h1>GIS Layer Explorer</h1>
      <p>Inspect and filter the GIS datasets available for Thodupuzha.</p>

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading layers...</p>
      ) : (
        <>
          {/* Layer selector */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="layer-select">
              <strong>Select layer: </strong>
            </label>{" "}

            <select
              id="layer-select"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              style={{
                padding: 10,
                minWidth: 220,
                border: "1px solid #d1d5db",
                borderRadius: 8,
              }}
            >
              {layers.map((layer) => (
                <option key={layer.name} value={layer.name}>
                  {formatName(layer.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Dataset summary */}
          {layerInfo && (
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
                margin: "24px 0",
              }}
            >
              <div style={cardStyle}>
                <p>Feature count</p>
                <h2>
                  {layerInfo.feature_count.toLocaleString()}
                </h2>
              </div>

              <div style={cardStyle}>
                <p>Geometry types</p>
                <h3>
                  {layerInfo.geometry_types.join(", ")}
                </h3>
              </div>

              <div style={cardStyle}>
                <p>Coordinate system</p>
                <h3>EPSG:4326</h3>
              </div>

              <div style={cardStyle}>
                <p>Matching features</p>
                <h2>{filteredFeatures.length.toLocaleString()}</h2>
              </div>
            </section>
          )}

          {/* Selected layer map */}
          <section style={{ margin: "28px 0" }}>
            <h2>Selected Layer Map</h2>
            <p>
              Showing: <strong>{formatName(selected)}</strong>
              {" · "}
              {filteredFeatures.length} matching features
            </p>

            <div
              style={{
                height: 420,
                width: "100%",
                overflow: "hidden",
                borderRadius: 12,
                border: "1px solid #e1e5eb",
                background: "#f3f4f6",
              }}
            >
              <MapContainer
                center={[9.895, 76.715]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {!loadingFeatures && filteredGeoJSON && (
                  <>
                    <GeoJSON
                      key={`${selected}-${searchTerm}-${filterColumn}-${filterValue}`}
                      data={filteredGeoJSON}
                      style={(feature) => {
                        const geometryType = feature?.geometry?.type;

                        if (
                          geometryType === "Polygon" ||
                          geometryType === "MultiPolygon"
                        ) {
                          return {
                            color: "#2563eb",
                            weight: 1.5,
                            fillColor: "#60a5fa",
                            fillOpacity: 0.3,
                          };
                        }

                        return {
                          color: "#2563eb",
                          weight: 3,
                        };
                      }}
                      pointToLayer={(feature, latlng) =>
                        L.circleMarker(latlng, {
                          radius: 6,
                          color: "#1d4ed8",
                          fillColor: "#60a5fa",
                          fillOpacity: 0.9,
                        })
                      }
                      onEachFeature={(feature, layer) => {
                        const props = feature.properties ?? {};

                        const content = Object.entries(props)
                          .slice(0, 10)
                          .map(
                            ([key, value]) =>
                              `<b>${key}</b>: ${String(value ?? "—")}`
                          )
                          .join("<br>");

                        if (content) {
                          layer.bindPopup(content);
                        }
                      }}
                    />

                    <FitLayer data={filteredGeoJSON} />
                  </>
                )}
              </MapContainer>
            </div>

            {loadingFeatures && <p>Loading layer features...</p>}
          </section>

          {/* Attribute table controls */}
          <section style={{ marginTop: 32 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <h2 style={{ margin: 0 }}>Attribute Table</h2>

              <button
                onClick={exportCSV}
                disabled={
                  loadingFeatures || filteredFeatures.length === 0
                }
                style={buttonStyle}
              >
                Export CSV
              </button>
            </div>

            {/* Attribute filter and general search */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <select
                aria-label="Filter attribute column"
                value={filterColumn}
                onChange={(event) => {
                  setFilterColumn(event.target.value);
                  setPage(0);
                }}
                style={inputStyle}
              >
                <option value="">All attributes</option>

                {properties.map((property) => (
                  <option key={property} value={property}>
                    {property}
                  </option>
                ))}
              </select>

              <input
                type="search"
                placeholder="Filter by attribute value..."
                aria-label="Filter by selected attribute value"
                value={filterValue}
                onChange={(event) => {
                  setFilterValue(event.target.value);
                  setPage(0);
                }}
                style={{ ...inputStyle, flex: "1 1 220px" }}
              />

              <input
                type="search"
                placeholder="Search all attributes..."
                aria-label="Search all feature attributes"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(0);
                }}
                style={{ ...inputStyle, flex: "1 1 220px" }}
              />

              <button onClick={clearFilters} style={buttonStyle}>
                Clear Filters
              </button>
            </div>

            {!loadingFeatures && (
              <p>
                Showing{" "}
                {filteredFeatures.length === 0
                  ? 0
                  : page * PAGE_SIZE + 1}
                {"–"}
                {Math.min(
                  (page + 1) * PAGE_SIZE,
                  filteredFeatures.length
                )}
                {" "}of {filteredFeatures.length} matching features
              </p>
            )}

            {loadingFeatures ? (
              <p>Loading feature attributes...</p>
            ) : filteredFeatures.length === 0 ? (
              <p>No matching features found.</p>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={cellStyle}>Feature</th>

                        {properties.map((key) => (
                          <th key={key} style={cellStyle}>
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {visibleFeatures.map((feature, index) => (
                        <tr
                          key={
                            feature.id ??
                            `${page * PAGE_SIZE + index}`
                          }
                        >
                          <td style={cellStyle}>
                            {page * PAGE_SIZE + index + 1}
                          </td>

                          {properties.map((key) => (
                            <td key={key} style={cellStyle}>
                              {String(
                                feature.properties?.[key] ?? "—"
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                    marginTop: 20,
                  }}
                >
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    style={buttonStyle}
                  >
                    Previous
                  </button>

                  <span>
                    Page {page + 1} of {pageCount}
                  </span>

                  <button
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((p) => p + 1)}
                    style={buttonStyle}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}

const cardStyle = {
  border: "1px solid #e1e5eb",
  borderRadius: 12,
  padding: 16,
  background: "#fff",
};

const cellStyle = {
  border: "1px solid #e1e5eb",
  padding: 10,
  textAlign: "left",
  whiteSpace: "nowrap",
};

const inputStyle = {
  padding: 10,
  minWidth: 180,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#fff",
};

const buttonStyle = {
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  cursor: "pointer",
};
