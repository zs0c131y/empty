# Smart Classroom Energy Management System (Arduino Uno, Wokwi)

Light and fan automation from an LDR, PIR and DHT sensor, with a 30-second inactivity shutdown and a Serial status line.

## Run in VS Code with the Wokwi extension
1. Install the **Wokwi Simulator** extension and request its (free) license: `F1` -> "Wokwi: Request a Free License".
2. Install `arduino-cli`, then build: `./build.sh` (or the VS Code build task, `Ctrl+Shift+B`).
   This installs the AVR core and the Adafruit DHT libraries and writes the `.hex`/`.elf` that `wokwi.toml` points to.
3. `F1` -> "Wokwi: Start Simulator". Open the Serial Monitor tab in the simulator to see the status line.

Simulator link for Google Classroom: put it here after publishing the project on wokwi.com (optional): `<paste link>`

## Controls in the simulator
- Click the PIR to trigger motion. Drag the LDR lux slider (low = dark). Edit the DHT temperature.

## Files
| File | Purpose |
|---|---|
| `smart_classroom/smart_classroom.ino` | firmware |
| `diagram.json`, `wokwi.toml` | Wokwi circuit and firmware path |
| `docs/architecture.svg` / `.png` | block diagram |
| `docs/pin_connections.md` | pin table |
| `docs/test_report.md` | T1-T7 table to fill in |
| `docs/technical_note.md` | 150-250 word note |

## Known assumptions
- Wokwi has a DHT22 part, so the simulated circuit uses it; the sketch has `DHT_TYPE` to switch to a real DHT11.
- The LDR module's AO is assumed to rise with brightness (`LDR_HIGH_MEANS_BRIGHT`). If dark/bright is reversed in your run, set it to 0.
- Circuit screenshots, functional evidence and the actual T1-T7 results must come from your own run.
