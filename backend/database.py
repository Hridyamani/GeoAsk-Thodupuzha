from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./geoask.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class QueryHistory(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    query_text = Column(String, index=True)
    status = Column(String)
    date_time = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)