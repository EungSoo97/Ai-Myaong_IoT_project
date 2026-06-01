from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database.base import Base
from datetime import datetime

class DetectionLog(Base):
    __tablename__ = "DETECTION_LOGS"

    log_id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, ForeignKey("USERS.user_id"), nullable=False)
    pet_id         = Column(Integer, ForeignKey("PETS.pet_id"),   nullable=False)
    pose           = Column(String(50),  nullable=True)
    activity_level = Column(Float,       nullable=True)
    confidence     = Column(Float,       nullable=True)
    created_at     = Column(DateTime,    default=datetime.utcnow)

    user = relationship("User", back_populates="detection_logs")
    pet  = relationship("Pet",  back_populates="detection_logs")