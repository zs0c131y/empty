# Test report T1-T7

Fill the "Actual" and "Result" columns while running the simulation (Wokwi: click the PIR to toggle motion,
drag the LDR lux slider, edit the DHT temperature). Read the state from the Serial Monitor line.

| ID | Condition | Expected | How to set it up in Wokwi | Actual observation | Result | Correction made |
|---|---|---|---|---|---|---|
| T1 | Dark + motion | Light ON | LDR lux low, trigger PIR | | | |
| T2 | Bright + motion | Light OFF | LDR lux high, trigger PIR | | | |
| T3 | Occupied + temp > 30 C | Fan ON | trigger PIR, DHT temp 32 | | | |
| T4 | Occupied + temp < 27 C | Fan OFF | trigger PIR, DHT temp 25 | | | |
| T5 | Temp 27-30 C | Fan keeps previous state | Run once from fan ON (32 -> 28) and once from fan OFF (25 -> 28) | | | |
| T6 | No motion for 30 s | Light OFF, fan OFF | stop triggering PIR, wait 30 s | | | |
| T7 | Motion after inactivity | Automation resumes from current sensor values | trigger PIR again | | | |

Notes for the tester:
- The Wokwi PIR holds its output HIGH for a few seconds after a trigger; the 30 s timer starts from the last HIGH sample.
- After an inactivity shutdown the fan memory is cleared, so in T7 with 27-30 C the fan stays OFF until temp goes above 30 C.
