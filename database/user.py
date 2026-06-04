from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from database.base import Base
from datetime import datetime

class User(Base):
    __tablename__ = "USERS"

    user_id            = Column(Integer, primary_key=True, autoincrement=True)
    username           = Column(String(50),  nullable=True,  unique=True)   # 일반 로그인 아이디
    email              = Column(String(100), nullable=False, unique=True)
    password           = Column(String(255), nullable=True)                 # 소셜 전용 계정은 null
    nickname           = Column(String(50),  nullable=True)
    profile_photo_path = Column(String(500), nullable=True)
    oauth_provider     = Column(String(20),  nullable=True)                 # 'google' | null
    oauth_id           = Column(String(255), nullable=True)                 # 소셜 provider 고유 ID
    created_at         = Column(DateTime, default=datetime.utcnow)

    pets    = relationship("Pet",   back_populates="user")
    alerts  = relationship("Alert", back_populates="user")
    clips           = relationship("Clip",          back_populates="user")
    settings        = relationship("Settings",      back_populates="user")
    detection_logs = relationship("DetectionLog",    back_populates="user")
    feed_logs      = relationship("FeedLog",         back_populates="user")
    water_logs     = relationship("WaterLog",        back_populates="user")
    health_reports = relationship("PetHealthReport", back_populates="user")

