
import re

import geopandas as gpd
import pandas as pd

from gis_data import LAYER_FILES, load_layer


# Map natural-language terms to your actual GIS layer names.
LAYER_KEYWORDS = {
    "education": [
        "school", "schools", "college", "colleges",
        "education", "educational institution",
    ],
    "healthcare": [
        "hospital", "hospitals", "healthcare",
        "health care", "clinic", "clinics",
    ],
    "pharmacies": ["pharmacy", "pharmacies", "medical store"],
    "food_services": [
        "restaurant", "restaurants", "food", "hotel",
        "hotels", "food service",
    ],
    "green_spaces": [
        "park", "parks", "green space", "green spaces",
    ],
    "buildings": ["building", "buildings"],
    "landuse": ["land use", "landuse"],
    "roads": ["road", "roads", "street", "streets"],
    "shops": ["shop", "shops", "store", "stores"],
    "transport": [
        "bus stop", "bus stops", "transport", "transportation",
    ],
    "waterways": [
        "river", "rivers", "waterway", "waterways", "stream",
    ],
}

LAYER_COLORS = {
    "education": "#2563eb",
    "healthcare": "#dc2626",
    "pharmacies": "#9333ea",
    "food_services": "#ea580c",
    "green_spaces": "#16a34a",
    "buildings": "#64748b",
    "landuse": "#a16207",
    "roads": "#475569",
    "shops": "#db2777",
    "transport": "#0891b2",
    "waterways": "#0284c7",
}


def identify_layer(query: str):
    """Identify a GIS layer mentioned in the question."""
    text = query.lower()
    matches = []

    for layer_name, keywords in LAYER_KEYWORDS.items():
        for keyword in keywords:
            pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"
            if re.search(pattern, text):
                matches.append((len(keyword), layer_name))
                break

    if not matches:
        return None

    # Prefer the most specific matching phrase.
    matches.sort(reverse=True)
    return matches[0][1]


def clean_value(value):
    """Convert pandas/NumPy values to JSON-compatible values."""
    if value is None:
        return None

    if hasattr(value, "item"):
        try:
            value = value.item()
        except (ValueError, AttributeError):
            pass

    try:
        missing = pd.isna(value)
        if getattr(missing, "ndim", 0) == 0 and bool(missing):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def to_feature_collection(gdf):
    """Convert results to a GeoJSON FeatureCollection."""
    result = gdf.copy()

    if result.crs is not None and result.crs.to_epsg() != 4326:
        result = result.to_crs(epsg=4326)

    result = result[
        result.geometry.notna() & ~result.geometry.is_empty
    ]

    features = []

    for _, row in result.iterrows():
        properties = {
            column: clean_value(row[column])
            for column in result.columns
            if column != result.geometry.name
        }

        geometry = row.geometry.__geo_interface__

        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": properties,
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def run_spatial_query(query: str):
    """
    Execute supported natural-language GIS queries.

    Supported:
    - Show/list/find a layer.
    - Find one layer within a distance of another layer.
    - Find one layer near another layer.
    """
    query = query.strip()
    text = query.lower()

    target_layer = identify_layer(query)

    if target_layer is None:
        return {
            "status": "error",
            "explanation": (
                "I could not identify a supported GIS layer. "
                "Try asking about schools, hospitals, pharmacies, "
                "food services, green spaces, buildings, land use, "
                "roads, shops, transport, or waterways."
            ),
            "operations": [],
            "map_data": {
                "center": [9.895, 76.715],
                "buffers": [],
                "markers": [],
                "geojson": None,
            },
        }

    # Load the requested target layer.
    try:
        target = load_layer(target_layer)
    except Exception as exc:
        return {
            "status": "error",
            "explanation": f"Could not load {target_layer}: {exc}",
            "operations": [],
            "map_data": {
                "center": [9.895, 76.715],
                "buffers": [],
                "markers": [],
                "geojson": None,
            },
        }

    target = target[
        target.geometry.notna() & ~target.geometry.is_empty
    ].copy()

    # Check whether this is a proximity query.
    is_proximity = bool(
        re.search(r"\b(near|nearby|within|close to)\b", text)
    )

    distance_match = re.search(
        r"\b(\d+(?:\.\d+)?)\s*(km|kilometers?|m|meters?)\b",
        text,
    )

    distance_m = None
    if distance_match:
        distance = float(distance_match.group(1))
        unit = distance_match.group(2)

        distance_m = distance * (
            1000 if unit.startswith("k") else 1
        )

    # Identify a second layer for spatial comparison.
    second_layer = None
    if is_proximity:
        remaining_text = re.sub(
            r"\b(\d+(?:\.\d+)?)\s*(km|kilometers?|m|meters?)\b",
            " ",
            text,
        )

        for layer_name, keywords in LAYER_KEYWORDS.items():
            if layer_name == target_layer:
                continue

            if any(
                re.search(
                    r"(?<!\w)" + re.escape(keyword) + r"(?!\w)",
                    remaining_text,
                )
                for keyword in keywords
            ):
                second_layer = layer_name
                break

    operations = []
    buffers = []

    if is_proximity and second_layer:
        try:
            reference = load_layer(second_layer)
        except Exception as exc:
            return {
                "status": "error",
                "explanation": (
                    f"Could not load {second_layer}: {exc}"
                ),
                "operations": [],
                "map_data": {
                    "center": [9.895, 76.715],
                    "buffers": [],
                    "markers": [],
                    "geojson": None,
                },
            }

        target = target[
            target.geometry.notna() & ~target.geometry.is_empty
        ].copy()
        reference = reference[
            reference.geometry.notna()
            & ~reference.geometry.is_empty
        ].copy()

        if target.empty or reference.empty:
            result = target.iloc[0:0].copy()
        else:
            # Project both layers into metres for correct distance
            # calculations, then return results in EPSG:4326.
            combined = gpd.GeoDataFrame(
                geometry=gpd.GeoSeries(
                    list(target.geometry) + list(reference.geometry),
                    crs=target.crs or "EPSG:4326",
                ),
                crs=target.crs or "EPSG:4326",
            )

            projected_crs = combined.estimate_utm_crs()

            if projected_crs is None:
                raise ValueError(
                    "Could not determine a projected CRS for "
                    "distance calculations."
                )

            target_projected = target.to_crs(projected_crs)
            reference_projected = reference.to_crs(projected_crs)

            if distance_m is not None:
                reference_geometries = reference_projected.geometry
                search_area = reference_geometries.buffer(distance_m).union_all()
                mask = target_projected.geometry.intersects(search_area)

                result = target_projected.loc[mask].copy()

                buffers = [{
                    "type": "Feature",
                    "geometry": search_area.__geo_interface__,
                    "properties": {
                        "distance_m": distance_m,
                        "source_layer": second_layer,
                    },
                }]
                operation_name = "distance_filter"
            else:
                # "Near" without an explicit distance means nearest
                # feature distance is measured against the reference
                # layer; it does not impose an arbitrary cutoff.
                reference_union = reference_projected.geometry.union_all()
                distances = target_projected.geometry.distance(
                    reference_union
                )
                nearest_distance = distances.min()

                result = target_projected.loc[
                    distances <= nearest_distance + 0.001
                ].copy()
                operation_name = "nearest_features"

            result = result.to_crs(epsg=4326)

        operations.append({
            "type": operation_name if not target.empty else "distance_filter",
            "target_layer": target_layer,
            "reference_layer": second_layer,
            "distance_m": distance_m,
            "result_count": len(result),
        })

        explanation = (
            f"Found {len(result)} {target_layer.replace('_', ' ')} "
            f"features in the requested spatial search relative to "
            f"{second_layer.replace('_', ' ')}."
        )

    elif is_proximity and distance_m is not None:
        # A distance was specified, but no reference layer was found.
        return {
            "status": "error",
            "explanation": (
                "I detected a distance but could not identify the "
                "reference layer. Try, for example, "
                "'Find schools within 500 metres of hospitals'."
            ),
            "operations": [],
            "map_data": {
                "center": [9.895, 76.715],
                "buffers": [],
                "markers": [],
                "geojson": None,
            },
        }

    else:
        result = target
        operations.append({
            "type": "layer_filter",
            "target_layer": target_layer,
            "result_count": len(result),
        })
        explanation = (
            f"Retrieved {len(result)} features from the "
            f"{target_layer.replace('_', ' ')} layer."
        )

    geojson = to_feature_collection(result)

    return {
        "status": "success",
        "explanation": explanation,
        "operations": operations,
        "map_data": {
            "center": [9.895, 76.715],
            "buffers": buffers,
            "markers": [],
            "geojson": geojson,
            "layer": target_layer,
            "color": LAYER_COLORS.get(target_layer, "#2563eb"),
        },
    }


def run_planned_query(plan: dict):
    """
    Execute a validated Qwen3 query plan using the existing GIS
    loading and GeoJSON utilities.
    """
    target_layer = plan["target_layer"]
    reference_layer = plan["reference_layer"]
    distance_m = plan["distance_m"]
    operation = plan["operation"]

    if operation == "unsupported":
        return {
            "status": "error",
            "explanation": "This type of GIS query is not supported yet.",
            "operations": [],
            "map_data": {
                "center": [9.895, 76.715],
                "buffers": [],
                "markers": [],
                "geojson": None,
            },
        }

    # Build a query understood by the existing executor.
    if operation == "list_features":
        query_text = f"show all {target_layer.replace('_', ' ')}"
    elif operation == "within_distance":
        query_text = (
            f"find {target_layer.replace('_', ' ')} "
            f"within {distance_m} metres of "
            f"{reference_layer.replace('_', ' ')}"
        )
    else:
        raise ValueError(f"Unsupported planned operation: {operation}")

    # The existing keyword executor remains responsible for GIS
    # loading, distance calculations, buffers, and GeoJSON.
    return run_spatial_query(query_text)


def execute_query_plan(plan: dict):
    """Execute a validated Qwen3 plan without re-identifying layers."""

    target_layer = plan["target_layer"]
    reference_layer = plan["reference_layer"]
    distance_m = plan["distance_m"]
    operation = plan["operation"]

    empty_map = {
        "center": [9.895, 76.715],
        "buffers": [],
        "markers": [],
        "geojson": None,
    }

    if operation == "unsupported":
        return {
            "status": "error",
            "explanation": "This GIS query type is not supported yet.",
            "operations": [],
            "map_data": empty_map,
        }

    try:
        target = load_layer(target_layer)
        target = target[
            target.geometry.notna() & ~target.geometry.is_empty
        ].copy()

        buffers = []

        if operation == "within_distance":
            if not reference_layer or distance_m is None:
                raise ValueError("Reference layer and distance are required.")

            reference = load_layer(reference_layer)
            reference = reference[
                reference.geometry.notna() & ~reference.geometry.is_empty
            ].copy()

            if target.empty or reference.empty:
                result = target.iloc[0:0].copy()
            else:
                source_crs = target.crs or "EPSG:4326"
                target = target.set_crs(source_crs, allow_override=True) if target.crs is None else target
                reference = reference.set_crs(source_crs, allow_override=True) if reference.crs is None else reference

                target_projected = target.to_crs(
                    target.estimate_utm_crs()
                )
                reference_projected = reference.to_crs(
                    target_projected.crs
                )

                search_area = (
                    reference_projected.geometry
                    .buffer(float(distance_m))
                    .union_all()
                )

                mask = target_projected.geometry.intersects(search_area)
                result = target_projected.loc[mask].copy()
                result = result.to_crs(epsg=4326)

                buffers = [{
                    "type": "Feature",
                    "geometry": search_area.__geo_interface__,
                    "properties": {
                        "distance_m": float(distance_m),
                        "source_layer": reference_layer,
                    },
                }]

            operation_type = "distance_filter"
            explanation = (
                f"Found {len(result)} {target_layer.replace('_', ' ')} "
                f"features within {distance_m} metres of "
                f"{reference_layer.replace('_', ' ')}."
            )

        elif operation == "list_features":
            result = target
            operation_type = "layer_filter"
            explanation = (
                f"Retrieved {len(result)} features from the "
                f"{target_layer.replace('_', ' ')} layer."
            )

        else:
            raise ValueError(f"Unsupported operation: {operation}")

        return {
            "status": "success",
            "explanation": explanation,
            "operations": [{
                "type": operation_type,
                "target_layer": target_layer,
                "reference_layer": reference_layer,
                "distance_m": distance_m,
                "result_count": len(result),
            }],
            "map_data": {
                "center": [9.895, 76.715],
                "buffers": buffers,
                "markers": [],
                "geojson": to_feature_collection(result),
                "layer": target_layer,
                "color": LAYER_COLORS.get(target_layer, "#2563eb"),
            },
        }

    except Exception as exc:
        return {
            "status": "error",
            "explanation": f"Could not execute GIS query: {exc}",
            "operations": [],
            "map_data": empty_map,
        }

