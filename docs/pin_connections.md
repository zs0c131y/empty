# Pin-connection table (Arduino Uno)

| Component | Component pin | Uno pin | Notes |
|---|---|---|---|
| PIR motion sensor | VCC | 5V | |
| PIR motion sensor | GND | GND | |
| PIR motion sensor | OUT | D2 | digital input, HIGH = motion |
| DHT temperature sensor | VCC | 5V | |
| DHT temperature sensor | GND | GND | |
| DHT temperature sensor | SDA / DATA | D3 | read by Adafruit DHT library |
| LDR module | VCC | 5V | |
| LDR module | GND | GND | |
| LDR module | AO | A0 | analog 0-1023 |
| Light LED | anode (via 220 ohm) | D8 | cathode to GND |
| Fan LED (simulated) | anode (via 220 ohm) | D9 | cathode to GND |

Decision constants (all in `smart_classroom/smart_classroom.ino`):
dark < 400, bright > 500 (raw ADC, 400-500 holds previous), fan ON > 30 C, fan OFF < 27 C, timeout 30 000 ms.
