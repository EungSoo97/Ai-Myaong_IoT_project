from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel


class HealthReportPeriod(BaseModel):
    start: date
    end: date
    days: int


class HealthReportCreateResponse(BaseModel):
    report_id: int
    pet_id: int
    period: HealthReportPeriod
    input_summary: dict[str, Any]
    llm_result: Optional[str] = None
    risk_level: Optional[str] = None
    created_at: datetime


class HealthReportListItem(BaseModel):
    report_id: int
    pet_id: int
    period: Optional[HealthReportPeriod] = None
    llm_result: Optional[str] = None
    risk_level: Optional[str] = None
    created_at: datetime


class HealthReportDetailResponse(HealthReportCreateResponse):
    pass
