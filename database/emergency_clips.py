from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database.base import Base

class EmergencyClip(Base):
    __tablename__ = "EMERGENCY_CLIPS"

    clip_id    = Column(Integer, primary_key=True, autoincrement=True)
    alert_id   = Column(Integer, ForeignKey("ALERTS.alert_id"), nullable=False)
    file_path  = Column(String(500), nullable=False)

    alert = relationship("Alert", back_populates="emergency_clips")