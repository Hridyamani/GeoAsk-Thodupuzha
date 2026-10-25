import geopandas as gpd
import os
from shapely.geometry import Point, Polygon

# Define the study area center (Thodupuzha)
CENTER_LAT = 9.895
CENTER_LON = 76.715

def ensure_data_exists():
    """Creates dummy Thodupuzha data if files don't exist so the prototype works."""
    os.makedirs("data", exist_ok=True)
    
    schools_path = "data/schools.geojson"
    hospitals_path = "data/hospitals.geojson"
    
    if not os.path.exists(hospitals_path):
        hospitals = gpd.GeoDataFrame({
            'name': ['Taluk Hospital', 'Amala Medical Centre'],
            'geometry': [Point(76.715, 9.895), Point(76.725, 9.905)]
        }, crs="EPSG:4326")
        hospitals.to_file(hospitals_path, driver="GeoJSON")

    if not os.path.exists(schools_path):
        schools = gpd.GeoDataFrame({
            'name': ["St. Mary's School", "Govt LP School", "Sacred Heart", "St. George HS", "Far Away School"],
            'geometry': [
                Point(76.718, 9.897), # Inside
                Point(76.720, 9.900), # Inside
                Point(76.712, 9.892), # Inside
                Point(76.730, 9.910), # Outside
                Point(76.800, 9.950)  # Very far outside
            ]
        }, crs="EPSG:4326")
        schools.to_file(schools_path, driver="GeoJSON")

def _convert_gdf_to_leaflet(gdf, marker_type="school"):
    """Converts a GeoPandas DataFrame to a JSON list of markers for React."""
    markers = []
    for _, row in gdf.iterrows():
        if row.geometry.geom_type == 'Point':
            markers.append({
                "pos": [row.geometry.y, row.geometry.x],
                "type": marker_type,
                "name": row.get('name', 'Unknown')
            })
    return markers

def run_spatial_workflow(query):
    """
    Dynamically parses the query, runs GIS operations, and returns data.
    """
    ensure_data_exists()
    
    schools = gpd.read_file("data/schools.geojson")
    hospitals = gpd.read_file("data/hospitals.geojson")
    
    # Reproject to UTM Zone 43N for accurate distance (meters)
    schools_utm = schools.to_crs(epsg=32643)
    hospitals_utm = hospitals.to_crs(epsg=32643)

    # 1. Dynamic Distance Logic (Defaults to 2000m if no number is found)
    distance_m = 2000 
    query_lower = query.lower()
    if "1 km" in query_lower or "1km" in query_lower: distance_m = 1000
    if "3 km" in query_lower or "3km" in query_lower: distance_m = 3000
    if "500 m" in query_lower: distance_m = 500

    # 2. Run the GIS Operations
    hospital_buffers = hospitals_utm.copy()
    hospital_buffers['geometry'] = hospitals_utm.geometry.buffer(distance_m)

    schools_in_buffer = gpd.sjoin(schools_utm, hospital_buffers, how="inner", predicate="intersects")
    schools_in_buffer = schools_in_buffer.drop_duplicates(subset=['name_left'])
    
    schools_wgs = schools_in_buffer.to_crs(epsg=4326)
    
    # 3. Prepare Map Data
    map_data = {
        "center": [CENTER_LAT, CENTER_LON],
        "buffers": [
            {"center": [row.geometry.y, row.geometry.x], "radius": distance_m} 
            for _, row in hospitals.iterrows() 
        ],
        "markers": _convert_gdf_to_leaflet(schools_wgs, "school") + _convert_gdf_to_leaflet(hospitals, "hospital")
    }

    # 4. Prepare Data for the LLM
    found_school_names = schools_in_buffer['name_left'].tolist()
    
    return {
        "map_data": map_data,
        "count": len(found_school_names),
        "found_schools": found_school_names,
        "distance_used": distance_m # Pass this to the LLM to make it sound smart
    }