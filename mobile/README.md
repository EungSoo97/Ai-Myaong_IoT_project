# Ai:Myaong Mobile

기존 `frontend/` 웹과 같은 FastAPI 백엔드를 사용하는 React Native + Expo 앱입니다.

## 포함 기능

- 로그인, 2단계 회원가입, 토큰 유지
- 대시보드, 로봇 상태, 빠른 배식, 외출 모드
- 카메라 스트림, 캡처/녹화, 로봇·카메라 방향 제어
- 사료·물 제공량, 수동 배식/급수, 자동 스케줄
- 감지·급여 활동 기록과 알림
- 사용자 프로필 및 사진
- 반려동물 등록·수정·삭제 및 사진
- AI 건강 리포트 조회·생성
- 알림 설정, 로봇/MQTT/ESP32 설정, Wi-Fi 검색·전달

## 실행

```bash
cd mobile
cp .env.example .env
npm start
```

Expo Go를 사용하는 실제 휴대폰은 개발 PC의 `127.0.0.1`에 접근할 수 없습니다. `.env`의 `EXPO_PUBLIC_API_BASE_URL`을 배포 백엔드 주소 또는 같은 Wi-Fi에 있는 PC의 LAN 주소로 설정하세요.

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.20:8000
```

환경 변수를 변경한 뒤에는 Expo 개발 서버를 다시 시작해야 합니다.

## 웹과의 차이

- 브라우저 저장소 대신 `AsyncStorage`에 토큰과 계정 정보를 저장합니다.
- HTML/CSS, `react-router-dom`, `react-icons` 대신 React Native 컴포넌트, React Navigation, `lucide-react-native`를 사용합니다.
- 웹의 Google Identity Services는 네이티브에서 직접 사용할 수 없어 현재 이메일 로그인/가입을 우선 구현했습니다. 네이티브 Google 로그인은 OAuth 클라이언트 설정 후 `expo-auth-session`으로 추가할 수 있습니다.
- 웹의 아이디/비밀번호 찾기 화면은 현재 대응 백엔드 API가 없어 모바일에서도 안내만 제공합니다.
