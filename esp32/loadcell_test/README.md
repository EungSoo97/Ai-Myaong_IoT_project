# ESP32 HX711 Load Cell Test

ESP32 with two 1 kg load cells and two HX711 modules.

## Arduino library

Install this library from Arduino IDE Library Manager:

- `HX711` by Bogdan Necula / bogde

## Wiring

Default pins used by `AiMyaongLoadCellTest.ino`:

| Target | HX711 DT/DOUT | HX711 SCK | HX711 VCC | HX711 GND |
| --- | --- | --- | --- | --- |
| Food | GPIO32 | GPIO33 | 3.3V | GND |
| Water | GPIO25 | GPIO26 | 3.3V | GND |

Load cell wires usually connect to HX711 like this:

| Load cell wire | HX711 |
| --- | --- |
| Red | E+ |
| Black | E- |
| White | A- |
| Green | A+ |

Some load cells use different wire colors. Check the sensor datasheet if values move in the wrong direction or stay fixed.

## Serial monitor

- Baud rate: `115200`
- Line ending: `No line ending`

Commands:

- `t`: tare both food and water scales
- `f`: tare food scale only
- `w`: tare water scale only
- `r`: print raw values once

## Calibration

The sketch prints raw values, zero-adjusted raw values, and calculated grams.

1. Upload the sketch.
2. Open Serial Monitor at `115200`.
3. Keep both scales empty and send `t`.
4. Put a known weight on one scale.
5. Use the printed `adjusted_raw` value to adjust `FOOD_CALIBRATION_FACTOR` or `WATER_CALIBRATION_FACTOR` in the sketch.

Formula:

```text
calibration factor = adjusted_raw value / known weight in grams
```

Example: if a 500 g weight shows `adjusted_raw=-107500`, use `-215.0`.

## Troubleshooting

### `HX711 not ready`

This means the ESP32 is not receiving a ready signal from the HX711 `DT/DOUT` pin.

Check these first:

- HX711 `VCC` is connected to ESP32 `3.3V`.
- HX711 `GND` is connected to ESP32 `GND`.
- Water HX711 `DT/DOUT` is connected to `GPIO25`.
- Water HX711 `SCK` is connected to `GPIO26`.
- `DT/DOUT` and `SCK` are not swapped.
- The HX711 board and load cell wires are firmly connected.

If you used different ESP32 pins, change these lines in the sketch:

```cpp
const int WATER_DOUT_PIN = 25;
const int WATER_SCK_PIN = 26;
```

### Very large or negative gram values

Large or negative values are normal before calibration. First check that `adjusted_raw` changes when weight is added.

If `adjusted_raw` stays almost fixed:

- Send `t` with the scale empty.
- Check load cell wiring: `E+`, `E-`, `A+`, `A-`.
- Try swapping `A+` and `A-` if the value moves in the opposite direction.

If the value changes but grams are wrong, calculate and update the calibration factor.
