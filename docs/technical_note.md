# Technical note

**Control logic.** The Arduino treats "recent motion" as occupancy: the PIR is sampled on every loop pass and each HIGH reading resets a 30-second timer kept with millis(), so nothing blocks. While occupied, the light follows the LDR (ON only when dark; a 400-500 ADC dead band stops flicker near the threshold) and the fan follows temperature with hysteresis: ON above 30 C, OFF below 27 C, unchanged in between. When 30 seconds pass without motion, both outputs are forced OFF and the fan memory is cleared, so automation restarts cleanly on the next movement. Every second a status line reports light level, motion, temperature, light state and fan state over Serial.

**Challenge.** The DHT sensor cannot be read faster than about once every two seconds, and a blocking delay() would have missed short PIR pulses. Sampling the PIR every pass and reading the DHT on its own timer, keeping the last valid temperature if a read fails, solved both.

**Improvement.** A PIR only sees movement, so a quiet, still class would be switched off. Adding a second presence cue (for example a CO2 or ultrasonic people-count sensor) or a manual override button would stop false shutdowns, and logging energy-on time over MQTT would let the savings be measured.
