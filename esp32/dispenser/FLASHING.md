# 디스펜서 ESP32 플래시 안내

이 변경은 **ESP32 펌웨어를 다시 구워야 적용됩니다.** git pull + 서버 재시작으로는 백엔드·프론트만
바뀝니다. 코드에 OTA가 없어서 USB 케이블이 필요합니다.

굽기 전까지는 앱의 사료/물 잔여량이 `— / 연결 안 됨` 으로 표시됩니다. 고장이 아니라, 값을
모르는 상태를 그대로 보여주는 것입니다.

## 무엇이 바뀌었나

| | 전 | 후 |
|---|---|---|
| 사료 잔여량 | 하드코딩 28% | 로드셀 실측 g |
| 물 잔여량 | 하드코딩 62% | 로드셀 실측 ml (물 1g = 1ml) |
| 물 급수 | **동작 안 함** (`dispenseWater` 가 TODO 스텁) | GPIO32 펌프, 초 단위 |
| 배식 통계 | 슬라이더에 적힌 값(허구) | ESP32 가 저울로 잰 실제 배출량 |
| 급수 통계 | 슬라이더에 적힌 값(허구) | 폐지 → **음수량**(물통 무게 감소분)으로 대체 |

물만 초 단위인 이유: 물통이 저수조 겸 음수대라 펌프를 돌려도 물이 통 밖으로 나가지 않습니다
(순환). "몇 ml 급수"가 물리적으로 성립하지 않아 "몇 초 돌릴지"로만 지시합니다. 물이 실제로
줄어드는 건 고양이가 마셨을 때뿐이고, 그건 물통 무게가 떨어지는 것으로 잡습니다.

## 배선 (기존 그대로, 확인용)

```
사료 로드셀 HX711    DOUT -> GPIO34    SCK -> GPIO33
물   로드셀 HX711    DOUT -> GPIO35    SCK -> GPIO22
사료 모터 TB6612FNG  AIN1 -> GPIO25    AIN2 -> GPIO26   PWMA -> GPIO27   STBY -> GPIO23
물 펌프 MOSFET       게이트 -> GPIO32 (100~220옴 저항 경유)
HX711 공통           VCC -> 3V3        GND -> GND
```

GPIO34/35 는 입력 전용이라 DOUT 에 맞습니다. 로드셀 핀은 `esp32/main/loadcell_control.h` 와 동일.

## 굽기

Arduino IDE:
1. 보드: **ESP32 Dev Module** (다른 변종이면 알려주세요 — FQBN 이 달라집니다)
2. 라이브러리: **HX711 Arduino Library** (bogde), **PubSubClient** (knolleary)
3. `esp32/dispenser/AiMyaongDispenser/AiMyaongDispenser.ino` 열고 업로드

> **"Erase All Flash Before Sketch Upload" 는 끄고 구우세요.**
> Wi-Fi/MQTT 설정이 NVS(Preferences)에 있어서 지우면 설정 포털부터 다시 해야 합니다.
> 일반 업로드는 NVS를 건드리지 않습니다.

arduino-cli:
```bash
arduino-cli compile --fqbn esp32:esp32:esp32 esp32/dispenser/AiMyaongDispenser
arduino-cli upload  --fqbn esp32:esp32:esp32 -p COM3 esp32/dispenser/AiMyaongDispenser
```

빌드 검증은 끝나 있습니다: **974,095 바이트 (74%), RAM 14%, 경고 0건** (esp32 코어 3.3.10).

## 구운 뒤 확인

시리얼 모니터 115200:
```
[loadcell] food ready, tare done      <- 사료 로드셀 정상
[loadcell] water ready, tare done     <- 물 로드셀 정상
```
`not responding` 이 뜨면 그 채널 배선/핀을 확인하세요. 한쪽만 죽어도 다른 쪽은 정상 동작하고,
앱에는 죽은 쪽만 "연결 안 됨" 으로 나옵니다.

브로커에서:
```bash
mosquitto_sub -h <host> -p 8883 -u <user> -P <pass> --capath /etc/ssl/certs -t 'dispenser/#' -v
```
1초마다 `dispenser/weight {"food_g":..,"water_g":..}` 가 흐르면 성공입니다.

배식하면 저울이 잠잠해지는 즉시 `dispenser/dispensed {"food_g":24.3}` 이 한 번 나갑니다.

## 보정 (중요)

`dispenser_loadcell.h` 의 스케일 값은 **아직 실측 보정 전입니다.**

```cpp
constexpr float FOOD_LOADCELL_SCALE = -7050.0f;
constexpr float WATER_LOADCELL_SCALE = -7050.0f;
```

로드셀마다 값이 달라서, 지금 상태로는 g 이 실제와 안 맞을 수 있습니다. 알려진 무게(예: 500g
추)를 올리고 표시값이 맞을 때까지 이 상수를 조정한 뒤 다시 구워주세요. 물은 1g = 1ml 이므로
물 로드셀도 g 기준으로 맞추면 됩니다.

`dispenser/tare` 토픽(앱의 tare 버튼)으로 언제든 영점을 다시 잡을 수 있습니다.

## 백엔드 쪽 설정

`backend/.env` (선택):

```env
DISPENSER_FOOD_CAPACITY_G=1000      # % 게이지 기준 = 사료통 가득 찼을 때 g
DISPENSER_WATER_CAPACITY_ML=1000    # % 게이지 기준 = 물통 가득 찼을 때 ml
DISPENSER_PET_ID=                   # 통계를 어느 펫에 기록할지. 비우면 첫 번째 펫
WATER_CONSUMPTION_MIN_ML=5          # 이만큼 줄어야 음수량으로 기록 (노이즈 무시)
```

**`DISPENSER_PET_ID` 는 지정하는 게 좋습니다.** DB에 펫이 9마리 등록돼 있는데, 기기와 사용자를
잇는 테이블이 없어서 미지정 시 `pet_id` 가 가장 작은 펫에 기록됩니다.
