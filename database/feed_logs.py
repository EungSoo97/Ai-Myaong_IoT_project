from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Identity
from sqlalchemy.orm import relationship
from database.base import Base
from database.time_utils import now_kst_naive

class FeedLog(Base):
    __tablename__ = "FEED_LOGS"

    feed_id = Column(Integer, Identity(start=1), primary_key=True)

    user_id = Column(Integer, ForeignKey("USERS.user_id"), nullable=False)
    pet_id = Column(Integer, ForeignKey("PETS.pet_id"), nullable=False)
    food_amount_g = Column(Float, nullable=False)
    feed_type = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=now_kst_naive)

    user = relationship("User", back_populates="feed_logs")
    pet = relationship("Pet", back_populates="feed_logs")
