#!/usr/bin/env bash
# Compile the sketch for Arduino Uno so the Wokwi VS Code extension can run it.
set -euo pipefail
cd "$(dirname "$0")"
arduino-cli core install arduino:avr
arduino-cli lib install "DHT sensor library" "Adafruit Unified Sensor"
arduino-cli compile --fqbn arduino:avr:uno --output-dir smart_classroom/build/arduino.avr.uno smart_classroom
