from datetime import date
from typing import Optional, List

from pydantic import BaseModel, EmailStr


class PetCreate(BaseModel):
    name: str
    species: Optional[str] = None
    breed: Optional[str] = None
    gender: Optional[str] = None        # M / F
    birth_date: Optional[date] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    circumference: Optional[float] = None
    leg_length: Optional[float] = None


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    nickname: str
    pets: List[PetCreate] = []


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: int
    email: str
    nickname: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse