from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, QueryHistory
from openai import OpenAI
from gis_engine import run_spatial_workflow
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class QueryRequest(BaseModel):
    query: str

@app.post("/api/query")
def process_query(req: QueryRequest, db: Session = Depends(get_db)):
    
    # 1. RUN THE REAL GIS OPERATIONS
    gis_result = run_spatial_workflow(req.query)
    
    # 2. ASK THE LLM TO EXPLAIN THE RESULTS
    school_list = ", ".join(gis_result['found_schools']) if gis_result['found_schools'] else "None"
    
    prompt = f"""
    You are a helpful GIS assistant for Thodupuzha Municipality.
    The user asked: "{req.query}"
    
    The GIS system ran a {gis_result['distance_used']} meter buffer around hospitals and intersected it with schools.
    The system found {gis_result['count']} schools inside the buffer. 
    The names of the schools are: {school_list}.
    
    Write a friendly, conversational response explaining these specific results in 2-3 sentences. 
    If schools were found, list their names. If 0 schools were found, tell them none were found in that area.
    Do not use markdown. Just plain text.
    """

    try:
        ai_response = client.chat.completions.create(
            model="gpt-4o-mini", 
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        explanation = ai_response.choices[0].message.content
    except Exception as e:
        explanation = f"I successfully ran the GIS operation and found {gis_result['count']} schools within {gis_result['distance_used']} meters, but I couldn't connect to the AI model to write a summary."

    # 3. Save to Database (This makes the History page work!)
    new_query = QueryHistory(query_text=req.query, status="Completed")
    db.add(new_query)
    db.commit()

    # 4. Return to React
    return {
        "status": "success",
        "explanation": explanation,
        "operations": [
            "Load Schools Layer", 
            "Load Hospitals Layer", 
            f"Buffer Hospitals by {gis_result['distance_used']}m", 
            "Intersect with Schools"
        ],
        "map_data": gis_result["map_data"]
    }

# THIS IS THE MISSING PIECE FOR YOUR HISTORY PAGE:
@app.get("/api/history")
def get_history(db: Session = Depends(get_db)):
    records = db.query(QueryHistory).order_by(QueryHistory.id.desc()).all()
    return [
        {
            "id": r.id, 
            "query": r.query_text, 
            "status": r.status, 
            "date": r.date_time.strftime("%b %d, %Y %H:%M") 
        } for r in records
    ]