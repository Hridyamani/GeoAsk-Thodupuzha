
import re

import geopandas as gpd
import pandas as pd

from gis_data import LAYER_FILES, load_layer


# Map natural-language terms to actual GIS layer names.
LAYER_KEYWORDS = {
    "education": [
        "school", "schools", "college", "colleges",
        "education", "educational institution",
    ],
    "healthcare": [
        "hospital", "hospitals", "healthcare",
        "health care", "clinic", "clinics",
    ],
    "pharmacies": [
        "pharmacy", "pharmacies", "medical store",
    ],
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
    """Identify the first GIS layer mentioned in a query."""
    text = query.lower()
    matches = []

    for layer_name, keywords in LAYER_KEYWORDS.items():
        for keyword in keywords:
            pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"

            for match in re.finditer(pattern, text):
                matches.append((
                    match.start(),
                    -len(keyword),
                    layer_name,
                ))

    if not matches:
        return None

    matches.sort()
    return matches[0][2]


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
    """Convert a GeoDataFrame to a GeoJSON FeatureCollection."""
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

        features.append({
            "type": "Feature",
            "geometry": row.geometry.__geo_interface__,
            "properties": properties,
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def make_buffer_feature(search_area, projected_crs, distance_m, source_layer):
    """Convert a projected buffer into a Leaflet-compatible GeoJSON Feature."""
    buffer_geometry = gpd.GeoSeries(
        [search_area],
        crs=projected_crs,
    ).to_crs(epsg=4326).iloc[0]

    return {
        "type": "Feature",
        "geometry": buffer_geometry.__geo_interface__,
        "properties": {
            "distance_m": float(distance_m),
            "source_layer": source_layer,
        },
    }


def run_spatial_query(query: str):
    """
    Execute supported natural-language GIS queries.

    Supports:
    - Showing or listing a layer.
    - Finding a layer within a specified distance of another layer.
    - Finding the nearest features when no distance is specified.
    """
    query = query.strip()
    text = query.lower()

    if not query:
        return {
            "status": "error",
            "explanation": "Please enter a GIS query.",
            "operations": [],
            "map_data": {
                "center": [9.895, 76.715],
                "buffers": [],
                "markers": [],
                "geojson": None,
            },
        }

    # Find all layer mentions in their order in the user's query.
    layer_mentions = []

    for layer_name, keywords in LAYER_KEYWORDS.items():
        for keyword in keywords:
            pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"

            for match in re.finditer(pattern, text):
                layer_mentions.append((
                    match.start(),
                    -len(keyword),
                    layer_name,
                ))

    layer_mentions.sort()

    if not layer_mentions:
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

    target_layer = layer_mentions[0][2]

    # Detect proximity wording.
    is_proximity = bool(
        re.search(r"\b(near|nearby|within|close to)\b", text)
    )

    # Detect explicit distance, including metres, meters, m, and km.
    distance_match = re.search(
        r"\b(\d+(?:\.\d+)?)\s*"
        r"(kilometers?|kilometres?|km|meters?|metres?|m)\b",
        text,
    )

    distance_m = None

    if distance_match:
        distance = float(distance_match.group(1))
        unit = distance_match.group(2)

        if unit in ("km", "kilometer", "kilometers", "kilometre", "kilometres"):
            distance_m = distance * 1000
        else:
            distance_m = distance

    # Identify the reference layer from the remaining mentions.
    second_layer = None

    if is_proximity:
        for _, _, mentioned_layer in layer_mentions[1:]:
            if mentioned_layer != target_layer:
                second_layer = mentioned_layer
                break

    try:
        target = load_layer(target_layer)
        target = target[
            target.geometry.notna() & ~target.geometry.is_empty
        ].copy()
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

    operations = []
    buffers = []

    if is_proximity and second_layer:
        try:
            reference = load_layer(second_layer)
            reference = reference[
                reference.geometry.notna() & ~reference.geometry.is_empty
            ].copy()
        except Exception as exc:
            return {
                "status": "error",
                "explanation": f"Could not load {second_layer}: {exc}",
                "operations": [],
                "map_data": {
                    "center": [9.895, 76.715],
                    "buffers": [],
                    "markers": [],
                    "geojson": None,
                },
            }

        if target.empty or reference.empty:
            result = target.iloc[0:0].copy()
            operation_name = (
                "distance_filter"
                if distance_m is not None
                else "nearest_features"
            )
        else:
            # Work in a projected CRS so distances and buffers use metres.
            source_crs = target.crs or reference.crs or "EPSG:4326"

            if target.crs is None:
                target = target.set_crs(source_crs)

            if reference.crs is None:
                reference = reference.set_crs(source_crs)

            combined = gpd.GeoDataFrame(
                geometry=gpd.GeoSeries(
                    list(target.geometry) + list(reference.geometry),
                    crs=source_crs,
                ),
                crs=source_crs,
            )

            projected_crs = combined.estimate_utm_crs()

            if projected_crs is None:
                raise ValueError(
                    "Could not determine a projected CRS for distance calculations."
                )

            target_projected = target.to_crs(projected_crs)
            reference_projected = reference.to_crs(projected_crs)

            if distance_m is not None:
                # Find target features intersecting the reference buffer.
                search_area = (
                    reference_projected.geometry
                    .buffer(distance_m)
                    .union_all()
                )

                mask = target_projected.geometry.intersects(search_area)
                result = target_projected.loc[mask].copy()

                buffers.append(
                    make_buffer_feature(
                        search_area,
                        projected_crs,
                        distance_m,
                        second_layer,
                    )
                )

                operation_name = "distance_filter"

            else:
                # No explicit distance: return nearest target feature(s).
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
            "type": operation_name,
            "target_layer": target_layer,
            "reference_layer": second_layer,
            "distance_m": distance_m,
            "result_count": len(result),
        })

        if distance_m is not None:
            explanation = (
                f"Found {len(result)} {target_layer.replace('_', ' ')} "
                f"features within {distance_m:g} metres of "
                f"{second_layer.replace('_', ' ')}."
            )
        else:
            explanation = (
                f"Found {len(result)} nearest "
                f"{target_layer.replace('_', ' ')} features relative to "
                f"{second_layer.replace('_', ' ')}."
            )

    elif is_proximity:
        if distance_m is not None:
            explanation = (
                "A distance was detected, but I could not identify the "
                "reference layer. Try 'Find schools within 500 metres "
                "of hospitals'."
            )
        else:
            explanation = (
                "I could not identify the reference layer for this "
                "proximity query. Mention two supported layers."
            )

        return {
            "status": "error",
            "explanation": explanation,
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

    return {
        "status": "success",
        "explanation": explanation,
        "operations": operations,
        "map_data": {
            "center": [9.895, 76.715],
            "buffers": buffers,
            "markers": [],
            "geojson": to_feature_collection(result),
            "layer": target_layer,
            "color": LAYER_COLORS.get(target_layer, "#2563eb"),
        },
    }


def run_planned_query(plan: dict):
    """Execute a validated query plan using the existing GIS query engine."""
    target_layer = plan["target_layer"]
    reference_layer = plan.get("reference_layer")
    distance_m = plan.get("distance_m")
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

    if operation == "list_features":
        query_text = f"show all {target_layer.replace('_', ' ')}"

    elif operation == "within_distance":
        if not reference_layer or distance_m is None:
            raise ValueError(
                "Reference layer and distance are required."
            )

        query_text = (
            f"find {target_layer.replace('_', ' ')} "
            f"within {distance_m} metres of "
            f"{reference_layer.replace('_', ' ')}"
        )

    else:
        raise ValueError(f"Unsupported planned operation: {operation}")

    return run_spatial_query(query_text)


def execute_query_plan(plan: dict):
    """Execute a validated query plan without relying on user wording."""
    target_layer = plan["target_layer"]
    reference_layer = plan.get("reference_layer")
    distance_m = plan.get("distance_m")
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
                raise ValueError(
                    "Reference layer and distance are required."
                )

            reference = load_layer(reference_layer)
            reference = reference[
                reference.geometry.notna() & ~reference.geometry.is_empty
            ].copy()

            if target.empty or reference.empty:
                result = target.iloc[0:0].copy()
            else:
                source_crs = target.crs or reference.crs or "EPSG:4326"

                if target.crs is None:
                    target = target.set_crs(source_crs)

                if reference.crs is None:
                    reference = reference.set_crs(source_crs)

                projected_crs = target.estimate_utm_crs()

                if projected_crs is None:
                    raise ValueError(
                        "Could not determine a projected CRS."
                    )

                target_projected = target.to_crs(projected_crs)
                reference_projected = reference.to_crs(projected_crs)

                search_area = (
                    reference_projected.geometry
                    .buffer(float(distance_m))
                    .union_all()
                )

                mask = target_projected.geometry.intersects(search_area)
                result = target_projected.loc[mask].copy()
                result = result.to_crs(epsg=4326)

                buffers.append(
                    make_buffer_feature(
                        search_area,
                        projected_crs,
                        float(distance_m),
                        reference_layer,
                    )
                )

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
