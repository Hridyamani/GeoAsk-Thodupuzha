
from gis_data import GIS_DATA_DIR, LAYER_FILES, load_layer

print("GIS folder exists:", GIS_DATA_DIR.is_dir())
print("Number of configured layers:", len(LAYER_FILES))

for name in LAYER_FILES:
    try:
        gdf = load_layer(name)
        print(
            f"{name}: {len(gdf)} features | "
            f"CRS: {gdf.crs} | "
            f"Geometry types: {gdf.geom_type.unique().tolist()}"
        )
    except Exception as exc:
        print(f"{name}: ERROR - {exc}")
