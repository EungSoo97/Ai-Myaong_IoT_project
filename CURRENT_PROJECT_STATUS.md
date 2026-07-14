# Ai-Myaong 현재 프로젝트 상태 정리

> AI 비전, IoT 로봇, 자동 급식/급수 디스펜서, 웹/모바일 앱을 연결한 반려묘 케어 시스템  
> 작성 기준: 2026-07-13 현재 코드 구조

---

## 1. 프로젝트 개요

**Ai-Myaong**은 반려묘 보호자가 외부에서도 반려묘의 상태를 확인하고, 로봇 카메라와 디스펜서를 원격으로 제어할 수 있도록 만든 **AIoT 기반 반려묘 케어 서비스**입니다.

서비스는 크게 두 축으로 나뉩니다.

| 영역 | 설명 |
|------|------|
| **Remote Robot** | React/FastAPI에서 명령을 보내고, MQTT/Raspberry Pi/Arduino를 통해 로봇 이동과 카메라 pan/tilt를 제어 |
| **Dispenser** | React/FastAPI에서 급식/급수 요청을 보내고, MQTT/ESP32를 통해 사료와 물을 제어 |

추가로 OpenCV/YOLO 기반 비전 worker, 반려묘 활동량 분석, 건강 리포트, 알림, Wi-Fi 설정, 모바일 앱 구조까지 포함되어 있습니다.

---

## 2. 전체 시스템 구조

```text
[React Web / React Native Mobile]
              |
              | HTTP / WebSocket
              v
[FastAPI Backend]
   |      |        |        |
   |      |        |        +--> [Oracle DB / SQLAlchemy Models]
   |      |        |
   |      |        +--> [Health Report / LLM Service]
   |      |
   |      +--> MQTT publish
   |                |
   |                +--> [Raspberry Pi Agent]
   |                |       |-- MJPEG Camera Stream
   |                |       `-- Serial Bridge
   |                |
   |                +--> [ESP32 Dispenser]
   |
   +--> [Device Simulator]

[Desktop Vision Worker]
   |-- MJPEG Stream 수신
   |-- OpenCV/YOLO 분석
   |-- 감지 결과/활동량/이벤트를 Backend API로 전송

[Arduino Uno Robot Controller]
   |-- crawler motor 제어
   |-- camera pan/tilt servo 제어
   `-- rear ultrasonic sensor reporting
```

---

## 3. 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | React 18, Vite, React Router, Tailwind CSS |
| **Mobile** | React Native, Expo, React Navigation |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic |
| **Database** | Oracle DB, SQLAlchemy, oracledb |
| **Auth** | JWT, python-jose, passlib, bcrypt |
| **IoT Messaging** | MQTT, paho-mqtt |
| **Vision** | OpenCV, YOLO model, MJPEG stream |
| **Hardware** | Raspberry Pi, Arduino Uno, ESP32 |
| **Robot Control** | Serial communication, motor/servo control |
| **UI/Chart** | lucide-react, phosphor-react, react-icons, Recharts |
| **Deployment** | Railway, Vercel, HiveMQ |
| **Image Storage** | Firebase |

---

## 4. 배포 및 운영 계획

현재 프로젝트는 로컬 개발 환경뿐 아니라 외부 접속 가능한 서비스 형태로 배포하는 것을 목표로 합니다.

| 영역 | 배포/운영 플랫폼 | 역할 |
|------|----------------|------|
| **Backend** | Railway | FastAPI 서버 배포, API endpoint 제공 |
| **Frontend** | Vercel | React/Vite 웹 클라이언트 배포 |
| **MQTT Broker** | HiveMQ | Raspberry Pi, ESP32, Backend 간 MQTT message broker |
| **Image Storage** | Firebase | 사용자/반려묘 이미지 및 서비스 이미지 저장 |

### 배포 후 예상 흐름

```text
[User Browser]
      |
      v
[Vercel Frontend]
      |
      | HTTPS API Request
      v
[Railway FastAPI Backend]
      |
      | MQTT Publish / Subscribe
      v
[HiveMQ MQTT Broker]
      |
      +--> [Raspberry Pi Robot Agent]
      +--> [ESP32 Dispenser]

[Frontend / Backend]
      |
      v
[Firebase Image Storage]
```

### 배포 구성의 의미

- 프론트엔드는 Vercel에 배포해 사용자 접근성을 확보
- 백엔드는 Railway에 배포해 FastAPI API 서버를 외부에서 호출 가능하게 구성
- MQTT는 HiveMQ를 사용해 로컬 네트워크 밖에서도 디바이스와 서버 간 메시지 중계 가능
- 이미지는 Firebase에 저장해 정적 asset과 사용자 업로드 데이터를 분리 관리

---

## 5. 구현된 주요 기능

### 5-1. 사용자/반려묘 관리

- 회원가입, 로그인, 아이디 찾기, 비밀번호 찾기/재설정 화면 구성: 경용
- JWT 기반 인증 구조: 영운
- 사용자별 반려묘 등록 및 상세 정보 관리: 경용
- 마이페이지, 프로필 수정, 설정 화면 제공: 경용

### 5-2. 대시보드

- 로그인 후 메인 화면에서 반려묘 상태와 주요 정보를 확인
- 급식/급수, 활동량, 알림, 건강 리포트로 이어지는 허브 역할
- 프론트엔드 private layout과 하단 탭 구조로 주요 화면 이동 지원

### 5-3. 로봇 제어

| API | 역할 |
|-----|------|
| `POST /api/robot/move` | 로봇 이동 명령 |
| `POST /api/robot/camera` | 카메라 pan/tilt 제어 |
| `POST /api/robot/away-mode` | 외출 모드 설정 |
| `POST /api/robot/capture` | 캡처 요청 |
| `GET /api/robot/status` | 로봇 상태 조회 |
| `GET /api/robot/dashboard` | 대시보드용 상태 조회 |
| `POST /api/robot/sensor` | 후방 초음파 센서값 업데이트 및 장애물 알림 생성 |

현재 로봇 제어는 `RobotService -> MQTT 또는 Local Serial/Simulator` 흐름으로 처리됩니다.

### 5-4. 후방 장애물 감지

- Arduino Uno에 후방 초음파 센서 코드가 추가되어 있음
- 거리 기준:
  - 장애물 감지: `15cm` 이하
  - 장애물 해제: `20cm` 이상
- 센서값은 `REAR_DISTANCE`, `REAR_OBSTACLE` 형태로 serial 출력
- 백엔드 `POST /api/robot/sensor`가 센서값을 받아 simulator 상태를 갱신
- 장애물 감지 시 `rear_obstacle` 알림 생성
- Vision 최신 감지 API에서도 후방 센서 상태를 함께 내려줌

### 5-5. AI 비전/활동량 분석

| API | 역할 |
|-----|------|
| `POST /api/vision/detections` | 객체 감지 결과 저장 |
| `GET /api/vision/detections/latest` | 최신 감지 결과 및 후방 센서 상태 조회 |
| `POST /api/vision/capture` | 비전 worker에 캡처 요청 |
| `POST /api/vision/recording` | 녹화 상태 제어 |
| `POST /api/vision/emergency` | 응급 감지 설정 |
| `POST /api/vision/events` | 비전 이벤트 저장 |
| `POST /api/vision/events/{alert_id}/media` | 이벤트에 영상/이미지 파일 연결 |
| `POST /api/vision/activity` | 활동량 데이터 저장 |
| `GET /api/vision/activity/stats` | 일/주/월 활동 통계 조회 |
| `GET /api/vision/events/recent` | 최근 비전 이벤트 조회 |

비전 worker는 `desktop/` 영역에서 MJPEG stream을 받아 OpenCV/YOLO 분석을 수행하는 구조입니다.

### 5-6. 자동 급식/급수 디스펜서

| API | 역할 |
|-----|------|
| `POST /api/dispenser/feed` | 사료 급식 명령 |
| `POST /api/dispenser/water` | 급수 명령 |
| `POST /api/dispenser/feed-log` | 급식 로그 저장 |
| `POST /api/dispenser/water-log` | 급수 로그 저장 |
| `GET /api/dispenser/logs` | 급식/급수 로그 조회 |

현재 상태:

- ESP32 디스펜서 sketch가 분리되어 있음
- 수동/자동/빠른 급식 기록을 DB에 저장
- 자동 급식/급수 로그는 같은 분 안에서 중복 저장되지 않도록 백엔드에서 방어
- `database/migrate_auto_feed_water_unique.sql`에 Oracle unique index 마이그레이션 스크립트가 있음
- `esp32/loadcell_test/`에 로드셀 테스트 sketch가 추가되어 있음

### 5-7. 건강 리포트

| API | 역할 |
|-----|------|
| `POST /api/pets/{pet_id}/health-report` | 최근 데이터를 기반으로 건강 리포트 생성 |
| `GET /api/pets/{pet_id}/health-reports` | 리포트 목록 조회 |
| `GET /api/pets/{pet_id}/health-report/latest` | 최신 리포트 조회 |

리포트는 최근 7일 기준 요약 데이터를 만들고, LLM service를 통해 건강 조언과 위험도를 저장하는 구조입니다.

저장 항목:

- 리포트 기간
- 입력 요약 JSON
- LLM 결과
- 위험도: `low`, `medium`, `high`, `unknown`

### 5-8. 네트워크/Wi-Fi/디바이스 등록

| API | 역할 |
|-----|------|
| `GET /api/network/status` | Raspberry Pi/Backend 네트워크 상태 조회 |
| `GET /api/network/pi-wifi-scan` | Pi agent를 통한 Wi-Fi scan |
| `POST /api/network/pi-wifi-connect` | Pi agent를 통한 Wi-Fi 연결 |
| `POST /api/network/shared-wifi` | 공유 Wi-Fi 설정 script 실행 |
| `POST /api/device/register` | Raspberry Pi 등 디바이스 등록 |
| `GET /api/device/{device_id}` | 등록된 디바이스 정보 조회 |

디바이스 등록 시 backend/desktop의 `.env`에 Pi agent URL과 MJPEG stream URL을 동기화하는 구조입니다.

---

## 6. 프론트엔드 화면 구성

| Route | 화면 |
|-------|------|
| `/splash` | 스플래시 |
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/find-id` | 아이디 찾기 |
| `/find-password` | 비밀번호 찾기 |
| `/reset-password` | 비밀번호 재설정 |
| `/` | 대시보드 |
| `/vision` | 로봇 비전/제어 |
| `/dispenser` | 디스펜서 |
| `/feeding` | 급식/급수 관리 |
| `/activity` | 활동량 |
| `/notifications` | 알림 |
| `/pet/:idx` | 반려묘 상세 |
| `/health-report/:idx` | 건강 리포트 |
| `/profile/edit` | 프로필 수정 |
| `/settings` | 설정 |
| `/mypage` | 마이페이지 |
| `/wifi-setup` | Wi-Fi 설정 |
| `/wifi-manager` | Wi-Fi 관리 |
| `/body-fat` | 비만도 계산 |
| `/console` | 알림 콘솔 |

---

## 7. 데이터베이스 구성

SQLAlchemy 모델 기준 주요 테이블은 다음과 같습니다.

| 테이블/모델 | 역할 |
|------------|------|
| `User` | 사용자 |
| `UserCredentials` | 인증 정보 |
| `UserOAuthConnections` | OAuth 연결 정보 |
| `Pets` | 반려묘 |
| `FeedLogs` | 급식 기록 |
| `WaterLogs` | 급수 기록 |
| `DetectionLogs` | 비전 감지 기록 |
| `DailyActivitySummaries` | 일별/시간대별 활동 요약 |
| `PetHealthReports` | 건강 리포트 |
| `Alerts` | 알림/이벤트 |
| `Clips` | 일반 클립 |
| `EmergencyClips` | 응급 클립 |
| `Settings` | 사용자 설정 |

데이터 흐름은 `사용자 -> 반려묘 -> 로그/알림/리포트`를 기준으로 구성되어 있습니다.

---

## 8. 하드웨어 구성

### Raspberry Pi

- Pi camera MJPEG stream 제공
- MQTT 구독
- serial bridge를 통해 Arduino에 명령 전달
- Pi agent API를 통해 Wi-Fi scan/connect, 상태 보고 가능

### Arduino Uno Robot Controller

- crawler motor 제어
- camera pan/tilt servo 제어
- 후방 초음파 센서 감지 및 serial report

### ESP32 Dispenser

- `dispenser/feed`, `dispenser/water` MQTT topic 수신
- 사료/물 액추에이터 제어
- 별도 로드셀 테스트 sketch 존재

### Desktop Vision Worker

- MJPEG stream 수신
- OpenCV/YOLO 분석
- 감지 결과, 캡처/녹화 이벤트, 활동량 데이터를 백엔드로 전송

---

## 9. 현재 구현 상태 요약

| 영역 | 상태 |
|------|------|
| Web UI | 주요 화면과 라우팅 구성 완료 |
| Mobile | Expo 기반 모바일 앱 구조 존재 |
| Backend API | 인증, 로봇, 디스펜서, 비전, 건강 리포트, 네트워크 API 구성 |
| DB Model | 사용자/반려묘/로그/알림/리포트 모델 구성 |
| MQTT | 백엔드 publish, Pi/ESP32 연동 구조 구성 |
| Simulator | 하드웨어 없이 명령 흐름 테스트 가능 |
| Vision | MJPEG/OpenCV/YOLO worker 구조 및 API 연동 |
| Robot Hardware | Arduino motor/servo/ultrasonic 코드 존재 |
| Dispenser Hardware | ESP32 dispenser sketch 존재 |
| Network Setup | Pi Wi-Fi 설정 및 device register API 구성 |

---

## 10. 담당 역할 분장

현재 프로젝트의 기능별 담당 구역은 다음과 같이 정리할 수 있습니다.

| 구분 | 담당자 | 담당 내용 |
|------|--------|----------|
| **사용자/반려묘 관리** | 경용, 영운 | 경용: 회원가입/로그인/아이디 찾기/비밀번호 재설정 화면, 반려묘 등록/상세 관리, 마이페이지/프로필 수정/설정 화면. 영운: JWT 기반 인증 구조 |
| **로봇 제어** | 응수 | 로봇 이동, 카메라 pan/tilt, 외출 모드, 캡처 요청 등 로봇 제어 흐름 |
| **후방 장애물 감지** | 경용 | Arduino 초음파 센서값 연동, 후방 장애물 상태 처리, 백엔드 센서 API 및 알림 흐름 |
| **AI 비전/활동량 분석** | 영운 | OpenCV/YOLO 기반 감지, 활동량 분석, 비전 이벤트/통계 처리 |
| **자동 급식/급수 디스펜서** | 경용 | 급식/급수 제어 화면 및 API 연동, 로그 저장, 자동 급식/급수 중복 방지 흐름 |
| **건강 리포트** | 태규 | 반려묘 건강 리포트 생성, 최근 데이터 요약, LLM 결과 저장/조회 |
| **네트워크/Wi-Fi/디바이스 등록** | 태규 | Raspberry Pi Wi-Fi 설정, Pi agent 연동, device register 및 환경변수 동기화 |
| **프론트엔드 화면 구성** | 경용 | React/Vite 기반 주요 화면, 라우팅, UI 구성 |
| **데이터베이스 구성** | 영운 | SQLAlchemy/Oracle 기반 사용자, 반려묘, 로그, 알림, 리포트 테이블 구조 |
| **하드웨어 구성** | 응수 | Raspberry Pi, Arduino Uno, ESP32 등 실제 하드웨어 제어 구조 |
| **모바일** | 태규 | React Native/Expo 기반 모바일 앱 구조 |
| **배포** | 태규 | Railway, Vercel, HiveMQ, Firebase 기반 배포/운영 구성 |

### 경용 담당 영역 요약

포트폴리오나 발표에서 경용 담당 영역은 다음처럼 묶어 설명할 수 있습니다.

- 사용자 인증 화면과 반려묘 관리 화면 구현
- 마이페이지, 프로필 수정, 설정 등 사용자 관리 UI 구현
- React/Vite 기반 주요 프론트엔드 화면 구성
- 자동 급식/급수 디스펜서 화면 및 백엔드 API 연동
- 급식/급수 로그 저장 흐름과 자동 로그 중복 방지 처리
- 후방 초음파 센서 기반 장애물 감지 및 알림 흐름 연동

---

## 11. 점검 필요 사항

현재 코드 기준으로 문서화하면서 확인한 주의점입니다.

- `docs/plan.md`에는 일부 항목이 아직 "Immediate Next Steps"로 남아 있어 실제 구현 상태와 문서 상태가 다를 수 있음
- `backend/app/routers/network.py`의 `_sync_backend_env_from_pi_ip()` 내부에서 `mqtt_port` 변수가 정의되지 않은 상태로 사용되는 부분이 있어 점검 필요
- 일부 한글 주석/문자열이 인코딩 깨짐 상태로 보이는 파일이 있음
- 실제 하드웨어 연동은 환경변수, MQTT broker, Pi agent, serial port 설정에 따라 동작 여부가 달라짐
- 건강 리포트 테이블의 신규 컬럼은 기존 DB에서는 별도 migration이 필요할 수 있음

---

## 12. 포트폴리오용 한 줄 설명

**Ai-Myaong은 Vercel에 배포되는 React 프론트엔드, Railway 기반 FastAPI 백엔드, HiveMQ MQTT broker, Firebase 이미지 저장소를 활용해 Raspberry Pi, Arduino, ESP32 디바이스와 연결되는 AIoT 반려묘 케어 시스템입니다.**

---

## 13. 추천 강조 포인트

- 단순 웹 서비스가 아니라 **실제 하드웨어 제어까지 연결한 end-to-end IoT 시스템**
- Vercel, Railway, HiveMQ, Firebase를 조합한 실제 배포/운영 구조
- 비전 worker, 백엔드 API, 프론트엔드 UI, DB, MQTT, 임베디드 코드가 분리된 구조
- 하드웨어 없이도 개발 가능한 simulator mode
- 사용자별 반려묘 데이터를 기반으로 급식/급수/활동량/건강 리포트까지 이어지는 데이터 흐름
- 후방 초음파 센서, 자동 급식 중복 방지, Pi agent 등록 등 실제 테스트 과정에서 나온 문제 해결 흔적
