
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
from gis_data import LAYER_FILES, load_layer


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
def process_query(
    req: QueryRequest,
    db: Session = Depends(get_db),
):
    try:
        # First, attempt natural-language planning with Qwen3.
        try:
            plan = plan_query(req.query)
            print("QWEN3 PLAN:", plan)

            result = execute_query_plan(plan)
            # If the planner's execution returns an error,
            # fall back to the existing keyword-based engine.
            if result.get("status") != "success":
                result = run_spatial_query(req.query)
                result["ai_used"] = False
                result["fallback_reason"] = (
                    "Planned GIS execution failed; used the "
                    "existing keyword-based engine."
                )
            else:
                result["ai_used"] = True

        except Exception as ai_exc:
            print(f"QWEN3 PLANNING ERROR: {ai_exc}")

            # Keep existing GIS functionality available if Qwen3
            # or query planning fails.
            result = run_spatial_query(req.query)
            result["ai_used"] = False
            result["fallback_reason"] = str(ai_exc)

        # Preserve the existing query-history behavior.
        new_query = QueryHistory(
            query_text=req.query,
            status=(
                "Completed"
                if result.get("status") == "success"
                else "Failed"
            ),
        )

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
        "type": "FeatureCollection",
        "name": layer_name,
        "features": features,
    }
@app.get("/api/history")
def get_query_history(
    db: Session = Depends(get_db),
):
    try:
        history = (
            db.query(QueryHistory)
            .order_by(QueryHistory.date_time.desc())
            .limit(100)
            .all()
        )

        return [
            {
                "id": item.id,
                "query_text": item.query_text,
                "status": item.status,
                "date_time": item.date_time.isoformat()
                if item.date_time
                else None,
            }
            for item in history
        ]

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve query history: {exc}",
        )
