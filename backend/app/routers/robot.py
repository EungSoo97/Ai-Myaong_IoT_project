from fastapi import APIRouter, Request

from app.models.command import CameraRequest, CommandResponse, MoveRequest, RobotStatus

router = APIRouter(prefix="/api/robot", tags=["robot"])


@router.post("/move", response_model=CommandResponse)
def move_robot(payload: MoveRequest, request: Request):
    return request.app.state.robot_service.move(payload.command)


@router.post("/camera", response_model=CommandResponse)
def move_camera(payload: CameraRequest, request: Request):
    return request.app.state.robot_service.camera(payload.direction)


@router.get("/status", response_model=RobotStatus)
def robot_status(request: Request):
    return request.app.state.robot_service.status()


@router.get("/dashboard")
def dashboard(request: Request):
    return request.app.state.robot_service.dashboard()
