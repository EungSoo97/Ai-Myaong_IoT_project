import json
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.models.health_report import (
    HealthReportCreateResponse,
    HealthReportDetailResponse,
    HealthReportListItem,
    HealthReportPeriod,
)
from app.routers.auth import _current_user
from app.services.health_report_service import build_pet_health_summary
from app.services.llm_service import generate_pet_health_advice
from database.base import get_db
from database.pet_health_reports import PetHealthReport
from database.pets import Pet
from database.time_utils import as_kst_aware


router = APIRouter(prefix="/api/pets", tags=["health-reports"])


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def _extract_risk_level(llm_result: str | None) -> str | None:
    if not llm_result:
        return None
    try:
        parsed = json.loads(llm_result)
    except json.JSONDecodeError:
        return "unknown"

    risk_level = parsed.get("risk_level")
    if risk_level in {"low", "medium", "high"}:
        return risk_level
    return "unknown"


def _summary_json(summary_data: dict[str, Any]) -> str:
    return json.dumps(summary_data, ensure_ascii=False, default=str)


def _pet_or_404(db: Session, user_id: int, pet_id: int) -> Pet:
    pet = db.query(Pet).filter(Pet.user_id == user_id, Pet.pet_id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found.")
    return pet


def _period_from_summary(summary_data: dict[str, Any]) -> HealthReportPeriod:
    period = summary_data["period"]
    return HealthReportPeriod(
        start=_parse_date(period.get("start")),
        end=_parse_date(period.get("end")),
        days=period["days"],
    )


def _period_from_report(report: PetHealthReport) -> HealthReportPeriod | None:
    if not report.period_start or not report.period_end:
        return None
    return HealthReportPeriod(
        start=report.period_start,
        end=report.period_end,
        days=(report.period_end - report.period_start).days + 1,
    )


def _input_summary_from_report(report: PetHealthReport) -> dict[str, Any]:
    if not report.input_summary_json:
        return {}
    try:
        return json.loads(report.input_summary_json)
    except json.JSONDecodeError:
        return {}


def _to_list_item(report: PetHealthReport) -> HealthReportListItem:
    return HealthReportListItem(
        report_id=report.report_id,
        pet_id=report.pet_id,
        period=_period_from_report(report),
        llm_result=report.llm_result,
        risk_level=report.risk_level,
        created_at=as_kst_aware(report.created_at),
    )


def _to_detail_response(report: PetHealthReport) -> HealthReportDetailResponse:
    input_summary = _input_summary_from_report(report)
    fallback_period = HealthReportPeriod(
        start=report.created_at.date(),
        end=report.created_at.date(),
        days=1,
    )
    return HealthReportDetailResponse(
        report_id=report.report_id,
        pet_id=report.pet_id,
        period=_period_from_report(report)
        or (_period_from_summary(input_summary) if input_summary else fallback_period),
        input_summary=input_summary,
        llm_result=report.llm_result,
        risk_level=report.risk_level,
        created_at=as_kst_aware(report.created_at),
    )


@router.post("/{pet_id}/health-report", response_model=HealthReportCreateResponse)
def create_health_report(
    pet_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)

    try:
        summary_data = build_pet_health_summary(db, user.user_id, pet_id, days=7)
    except ValueError as exc:
        if str(exc) == "Pet not found":
            raise HTTPException(status_code=404, detail="Pet not found.") from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    llm_result = generate_pet_health_advice(summary_data)
    period = summary_data["period"]
    report = PetHealthReport(
        user_id=user.user_id,
        pet_id=pet_id,
        period_start=_parse_date(period.get("start")),
        period_end=_parse_date(period.get("end")),
        input_summary_json=_summary_json(summary_data),
        llm_result=llm_result,
        risk_level=_extract_risk_level(llm_result),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return HealthReportCreateResponse(
        report_id=report.report_id,
        pet_id=report.pet_id,
        period=_period_from_summary(summary_data),
        input_summary=summary_data,
        llm_result=report.llm_result,
        risk_level=report.risk_level,
        created_at=as_kst_aware(report.created_at),
    )


@router.get("/{pet_id}/health-reports", response_model=list[HealthReportListItem])
def list_health_reports(
    pet_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    _pet_or_404(db, user.user_id, pet_id)
    reports = (
        db.query(PetHealthReport)
        .filter(PetHealthReport.user_id == user.user_id, PetHealthReport.pet_id == pet_id)
        .order_by(PetHealthReport.created_at.desc())
        .all()
    )
    return [_to_list_item(report) for report in reports]


@router.get("/{pet_id}/health-report/latest", response_model=HealthReportDetailResponse)
def get_latest_health_report(
    pet_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    _pet_or_404(db, user.user_id, pet_id)
    report = (
        db.query(PetHealthReport)
        .filter(PetHealthReport.user_id == user.user_id, PetHealthReport.pet_id == pet_id)
        .order_by(PetHealthReport.created_at.desc())
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Health report not found.")
    return _to_detail_response(report)
