
from pathlib import Path


import geopandas as gpd

# Existing processed GIS data folder
GIS_DATA_DIR = Path(
    r"C:\Users\User\Documents\B TECH\S7\MAIN PROJECT 1"
    r"\Thodupuzha GIS\03_PROCESSESSED DATA"
)

# Friendly layer names mapped to actual filenames
LAYER_FILES = {
    "buildings": "thodupuzha_buildings.geojson",
    "education": "thodupuzha_education.geojson",
    "food_services": "thodupuzha_food_services.geojson",
    "green_spaces": "thodupuzha_green_spaces.geojson",
    "healthcare": "thodupuzha_healthcare.geojson",
    "landuse": "thodupuzha_landuse.geojson",
    "pharmacies": "thodupuzha_pharmacies.geojson",
    "roads": "thodupuzha_roads.geojson",
    "shops": "thodupuzha_shops.geojson",
    "transport": "thodupuzha_transport.geojson",
    "waterways": "thodupuzha_waterways.geojson",
}


def load_layer(layer_name: str):
    """Load one GIS layer and return it in WGS84 for web maps."""
    if layer_name not in LAYER_FILES:
        raise ValueError(f"Unknown GIS layer: {layer_name}")

    file_path = GIS_DATA_DIR / LAYER_FILES[layer_name]

    if not file_path.is_file():
        raise FileNotFoundError(f"GIS file not found: {file_path}")

    gdf = gpd.read_file(file_path)

    if gdf.crs is None:
        raise ValueError(
            f"Layer '{layer_name}' has no CRS. "
            "Check its coordinate system before mapping."
        )

    # Leaflet expects longitude/latitude coordinates.
    return gdf.to_crs(epsg=4326)
