import geopandas as gpd
import os
import json
from shapely.geometry import Point, Polygon

# Define the study area center (Thodupuzha)
CENTER_LAT = 9.895
CENTER_LON = 76.715

def ensure_data_exists():
    """Creates dummy Thodupuzha data if files don't exist so the prototype works."""
    os.makedirs("data", exist_ok=True)
    
    schools_path = "data/schools.geojson"
    hospitals_path = "data/hospitals.geojson"
    boundary_path = "data/boundary.geojson"

    # 1. Create Dummy Hospitals (2 points)
    if not os.path.exists(hospitals_path):
        hospitals = gpd.GeoDataFrame({
            'name': ['Taluk Hospital', 'Amala Medical Centre'],
            'geometry': [Point(76.715, 9.895), Point(76.725, 9.905)]
        }, crs="EPSG:4326")
        hospitals.to_file(hospitals_path, driver="GeoJSON")

    # 2. Create Dummy Schools (4 points, some inside the 2km radius, some outside)
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

    # 3. Create Dummy Boundary
    if not os.path.exists(boundary_path):
        boundary = gpd.GeoDataFrame({
            'name': ['Thodupuzha Municipality'],
            'geometry': [Polygon([(76.65, 9.85), (76.80, 9.85), (76.80, 9.95), (76.65, 9.95)])]
        }, crs="EPSG:4326")
        boundary.to_file(boundary_path, driver="GeoJSON")

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
    Parses the query, runs real GeoPandas operations, and returns data for the UI.
    """
    ensure_data_exists()
    
    # Load the data
    schools = gpd.read_file("data/schools.geojson")
    hospitals = gpd.read_file("data/hospitals.geojson")
    
    # Reproject to UTM Zone 43N for accurate distance (meters)
    schools_utm = schools.to_crs(epsg=32643)
    hospitals_utm = hospitals.to_crs(epsg=32643)

    # 1. Run the GIS Operations (Buffer and Intersect)
    # Create 2km (2000m) buffer around hospitals
    hospital_buffers = hospitals_utm.copy()
    hospital_buffers['geometry'] = hospitals_utm.geometry.buffer(2000)

    # Find schools that intersect the buffer
    schools_in_buffer = gpd.sjoin(schools_utm, hospital_buffers, how="inner", predicate="intersects")
    
    # Drop duplicates (if a school is near multiple hospitals)
    schools_in_buffer = schools_in_buffer.drop_duplicates(subset=['name_left'])
    
    # Convert back to WGS84 (Lat/Lon) for the web map
    schools_wgs = schools_in_buffer.to_crs(epsg=4326)
    
    # 2. Prepare Map Data for Leaflet
    map_data = {
        "center": [CENTER_LAT, CENTER_LON],
        "buffers": [
            {"center": [row.geometry.y, row.geometry.x], "radius": 2000} 
            for _, row in hospitals.iterrows() # Note: using original WGS84 hospitals for center
        ],
        "markers": _convert_gdf_to_leaflet(schools_wgs, "school") + _convert_gdf_to_leaflet(hospitals, "hospital")
    }
import geopandas as gpd
import os
import json
from shapely.geometry import Point, Polygon

# Define the study area center (Thodupuzha)
CENTER_LAT = 9.895
CENTER_LON = 76.715

def ensure_data_exists():
    """Creates dummy Thodupuzha data if files don't exist so the prototype works."""
    os.makedirs("data", exist_ok=True)
    
    schools_path = "data/schools.geojson"
    hospitals_path = "data/hospitals.geojson"
    boundary_path = "data/boundary.geojson"

    # 1. Create Dummy Hospitals (2 points)
    if not os.path.exists(hospitals_path):
        hospitals = gpd.GeoDataFrame({
            'name': ['Taluk Hospital', 'Amala Medical Centre'],
            'geometry': [Point(76.715, 9.895), Point(76.725, 9.905)]
        }, crs="EPSG:4326")
        hospitals.to_file(hospitals_path, driver="GeoJSON")

    # 2. Create Dummy Schools (4 points, some inside the 2km radius, some outside)
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

    # 3. Create Dummy Boundary
    if not os.path.exists(boundary_path):
        boundary = gpd.GeoDataFrame({
            'name': ['Thodupuzha Municipality'],
            'geometry': [Polygon([(76.65, 9.85), (76.80, 9.85), (76.80, 9.95), (76.65, 9.95)])]
        }, crs="EPSG:4326")
        boundary.to_file(boundary_path, driver="GeoJSON")

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
    Parses the query, runs real GeoPandas operations, and returns data for the UI.
    """
    ensure_data_exists()
    
    # Load the data
    schools = gpd.read_file("data/schools.geojson")
    hospitals = gpd.read_file("data/hospitals.geojson")
    
    # Reproject to UTM Zone 43N for accurate distance (meters)
    schools_utm = schools.to_crs(epsg=32643)
    hospitals_utm = hospitals.to_crs(epsg=32643)

    # 1. Run the GIS Operations (Buffer and Intersect)
    # Create 2km (2000m) buffer around hospitals
    hospital_buffers = hospitals_utm.copy()
    hospital_buffers['geometry'] = hospitals_utm.geometry.buffer(2000)

    # Find schools that intersect the buffer
    schools_in_buffer = gpd.sjoin(schools_utm, hospital_buffers, how="inner", predicate="intersects")
    
    # Drop duplicates (if a school is near multiple hospitals)
    schools_in_buffer = schools_in_buffer.drop_duplicates(subset=['name_left'])
    
    # Convert back to WGS84 (Lat/Lon) for the web map
    schools_wgs = schools_in_buffer.to_crs(epsg=4326)
    
    # 2. Prepare Map Data for Leaflet
    map_data = {
        "center": [CENTER_LAT, CENTER_LON],
        "buffers": [
            {"center": [row.geometry.y, row.geometry.x], "radius": 2000} 
            for _, row in hospitals.iterrows() # Note: using original WGS84 hospitals for center
        ],
        "markers": _convert_gdf_to_leaflet(schools_wgs, "school") + _convert_gdf_to_leaflet(hospitals, "hospital")
    }

    # 3. Prepare Data for the LLM
    # We extract just the names of the schools found so the LLM can talk about them
    found_school_names = schools_in_buffer['name_left'].tolist()
    count = len(found_school_names)

    return {
        "map_data": map_data,
        "count": count,
        "found_schools": found_school_names
    }
    # 3. Prepare Data for the LLM
    # We extract just the names of the schools found so the LLM can talk about them
    found_school_names = schools_in_buffer['name_left'].tolist()
    count = len(found_school_names)

    return {
        "map_data": map_data,
        "count": count,
        "found_schools": found_school_names
    }