from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from database.base import Base
from datetime import datetime

class User(Base):
    __tablename__ = "USERS"

    user_id            = Column(Integer, primary_key=True, autoincrement=True)
    email              = Column(String(100), nullable=False, unique=True)
    password           = Column(String(255), nullable=False)
    profile_photo_path = Column(String(500), nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)

    pets    = relationship("Pet",   back_populates="user")
    alerts  = relationship("Alert", back_populates="user")
    pythonclips           = relationship("Clip",          back_populates="user")
    settings        = relationship("Settings",      back_populates="user")
    detection_logs = relationship("DetectionLog",    back_populates="user")
    feed_logs      = relationship("FeedLog",         back_populates="user")
    health_reports = relationship("PetHealthReport", back_populates="user")

    detection_logs = relationship("DetectionLog",    back_populates="pet")
    feed_logs      = relationship("FeedLog",         back_populates="pet")
    health_reports = relationship("PetHealthReport", back_populates="pet")
