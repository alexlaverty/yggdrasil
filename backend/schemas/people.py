"""Pydantic schemas for people-related endpoints."""

from pydantic import BaseModel
from typing import Optional


class CreatePersonRequest(BaseModel):
    first_name: str
    last_name: str
    sex: Optional[str] = None
    birth_date: Optional[str] = None
    birth_place: Optional[str] = None
    death_date: Optional[str] = None
    death_place: Optional[str] = None
    burial_date: Optional[str] = None
    burial_place: Optional[str] = None


class UpdatePersonRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    sex: Optional[str] = None
    profile_image_id: Optional[int] = None
    birth_date: Optional[str] = None
    birth_place: Optional[str] = None
    death_date: Optional[str] = None
    death_place: Optional[str] = None
    burial_date: Optional[str] = None
    burial_place: Optional[str] = None


class AddRelationshipRequest(BaseModel):
    related_person_id: int
