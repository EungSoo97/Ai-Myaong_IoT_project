from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from database.base import Base

class Pet(Base):
    __tablename__ = "PETS"

    pet_id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, ForeignKey("USERS.user_id"), nullable=False)
    name           = Column(String(50),  nullable=False)
    species        = Column(String(50),  nullable=True)
    breed          = Column(String(50),  nullable=True)
    birth_date     = Column(Date,        nullable=True)
    weight_kg      = Column(Float,       nullable=True)
    height_cm      = Column(Float,       nullable=True)
    # bmi            = Column(Float,       nullable=True)
    # obesity_grade  = Column(String(20),  nullable=True)
    # activity_goal  = Column(Float,       nullable=True)
    photo_path     = Column(String(500), nullable=True)

    user   = relationship("User",  back_populates="pets")
    alerts = relationship("Alert", back_populates="pet")
    detection_logs = relationship("DetectionLog",    back_populates="pet")
    feed_logs      = relationship("FeedLog",         back_populates="pet")
    water_logs     = relationship("WaterLog",        back_populates="pet")
    health_reports = relationship("PetHealthReport", back_populates="pet")
