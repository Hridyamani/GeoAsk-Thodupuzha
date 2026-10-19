from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, QueryHistory
from openai import OpenAI
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

    # 4. Return to React
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