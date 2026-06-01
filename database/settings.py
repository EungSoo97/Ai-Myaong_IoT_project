from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database.base import Base
from datetime import datetime

class Settings(Base):
    __tablename__ = "SETTINGS"

    setting_id    = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(Integer, ForeignKey("USERS.user_id"), nullable=False)
    away_mode     = Column(String(1),   default="N")
    wifi_ssid     = Column(String(100), nullable=True)
    wifi_password = Column(String(255), nullable=True)
    device_type   = Column(String(20),  nullable=True)
    updated_at    = Column(DateTime,    default=datetime.utcnow,
                           onupdate=datetime.utcnow)

    user = relationship("User", back_populates="settings")
