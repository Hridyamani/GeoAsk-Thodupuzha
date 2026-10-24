
import json
import math
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from shapely.geometry import mapping
from sqlalchemy.orm import Session
from query_planner import plan_query
from qwen_service import check_qwen_connection
from spatial_query import run_spatial_query, execute_query_plan


from database import SessionLocal, QueryHistory
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(title="GeoAsk-Thodupuzha API")

@app.get("/api/ai/health")
def qwen_health():
    return check_qwen_connection()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class QueryRequest(BaseModel):
    query: str


@app.get("/")
def home():
    return {"message": "GeoAsk-Thodupuzha API is running"}




@app.post("/api/query")
def process_query(req: QueryRequest, db: Session = Depends(get_db)):
    
    # ---------------------------------------------------------
    # 1. THIS IS WHERE YOU WOULD RUN GEOPANDAS / RAG
    # For now, we simulate that we found 4 schools and 2 hospitals.
    # ---------------------------------------------------------
    fake_gis_result = {
        "schools_found": ["St. Mary's School", "Govt LP School", "Sacred Heart", "St. George HS"],
        "hospitals_used": ["Taluk Hospital", "Amala Medical Centre"],
        "count": 4
    }

    # ---------------------------------------------------------
    # 2. ASK THE LLM TO EXPLAIN THE RESULT IN PLAIN LANGUAGE
    # ---------------------------------------------------------
    prompt = f"""
    You are a helpful GIS assistant for Thodupuzha Municipality.
    The user asked: "{req.query}"
    The GIS system found: {fake_gis_result}
    
    Write a friendly, conversational response explaining the results in 2-3 sentences. 
    Do not use markdown. Just plain text.
    """

    try:
        ai_response = client.chat.completions.create(
            model="gpt-4o-mini", # Or your model
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        explanation = ai_response.choices[0].message.content
    except Exception as e:
        explanation = f"I found {fake_gis_result['count']} schools, but I couldn't connect to the AI language model to write an explanation."

    # 3. Save to Database
    new_query = QueryHistory(query_text=req.query, status="Completed")
    db.add(new_query)
    db.commit()

        return result

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"GIS query processing failed: {exc}",
        )

@app.get("/api/layers")
def list_gis_layers():
    """List available GIS layers and their feature counts."""
    result = []

    for name in LAYER_FILES:
        try:
            gdf = load_layer(name)
            result.append({
                "name": name,
                "feature_count": len(gdf),
                "geometry_types": sorted(
                    gdf.geom_type.dropna().unique().tolist()
                ),
            })
        except Exception as exc:
            result.append({
                "name": name,
                "error": str(exc),
            })

    return {"layers": result}


@app.get("/api/layers/{layer_name}")
def get_gis_layer(layer_name: str):
    """Return a GIS layer as GeoJSON for Leaflet."""

    try:
        gdf = load_layer(layer_name)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load layer: {exc}",
        )

    gdf = gdf[
        gdf.geometry.notna() & ~gdf.geometry.is_empty
    ]

    features = []

    for _, row in gdf.iterrows():
        properties = row.drop(
            labels=[gdf.geometry.name]
        ).to_dict()

        clean_properties = {}

        for key, value in properties.items():
            if value is None:
                clean_properties[key] = None
                continue

            # Convert NumPy scalar values to native Python values.
            if hasattr(value, "item"):
                value = value.item()

            # Convert missing values to JSON null.
            try:
                missing = pd.isna(value)
                if isinstance(missing, bool) and missing:
                    clean_properties[key] = None
                    continue
            except (TypeError, ValueError):
                pass

            if isinstance(value, float) and not math.isfinite(value):
                clean_properties[key] = None
            else:
                clean_properties[key] = value

        safe_properties = json.loads(
            json.dumps(
                jsonable_encoder(clean_properties),
                allow_nan=False,
                default=str,
            )
        )

        features.append({
            "type": "Feature",
            "geometry": mapping(row.geometry),
            "properties": safe_properties,
        })

    return {
        "status": "success",
        "explanation": explanation, # The LLM text!
        "operations": ["Hospitals layer", "Schools layer", "2 km buffer", "Intersect"],
        "map_data": {
            "center": [9.895, 76.715],
            "buffers": [{"center": [9.895, 76.715], "radius": 2000}],
            "markers": [
                {"pos": [9.895, 76.715], "type": "hospital"},
                {"pos": [9.897, 76.718], "type": "school"},
                {"pos": [9.900, 76.720], "type": "school"}
            ]
        }
    }