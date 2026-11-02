/*
 * Smart Classroom Energy Management System
 * MCA | Internet of Things | In-class assignment
 *
 * Board : Arduino Uno
 * Inputs: LDR module (analog), PIR motion sensor, DHT temperature sensor
 * Output: LED = classroom light, LED = simulated fan, Serial status line
 *
 * Decision rules
 *   occupied = motion seen within the last INACTIVITY_TIMEOUT_MS
 *   light    = occupied AND dark
 *   fan      = occupied AND (temp > 30 C -> ON, temp < 27 C -> OFF,
 *              27..30 C -> keep previous state)
 *   no motion for 30 s -> light OFF, fan OFF (and fan memory cleared)
 *
 * Libraries: "DHT sensor library" and "Adafruit Unified Sensor" (Adafruit).
 */

#include <DHT.h>

// ---------------------------------------------------------------- Pin map
const uint8_t PIN_PIR   = 2;    // PIR OUT (digital input)
const uint8_t PIN_DHT   = 3;    // DHT data
const uint8_t PIN_LDR   = A0;   // LDR module analog out (AO)
const uint8_t PIN_LIGHT = 8;    // Light LED (through 220 ohm)
const uint8_t PIN_FAN   = 9;    // Fan LED   (through 220 ohm)

// ----------------------------------------------------------- Configuration
// Wokwi only ships the DHT22 part, so the simulation uses DHT22. For a real
// DHT11 kit change this to DHT11; the rest of the code is identical.
#define DHT_TYPE DHT22

// Wokwi's photoresistor module: AO rises with brightness. If your LDR is
// wired as a divider that falls with brightness, set this to 0.
#define LDR_HIGH_MEANS_BRIGHT 1

const int LDR_DARK_BELOW    = 400;   // raw ADC (0-1023): below -> dark
const int LDR_BRIGHT_ABOVE  = 500;   // above -> bright; band in between = hold
                                     // (small band stops flicker near the edge)

const float TEMP_FAN_ON_ABOVE  = 30.0f;  // deg C
const float TEMP_FAN_OFF_BELOW = 27.0f;  // deg C

const unsigned long INACTIVITY_TIMEOUT_MS = 30000UL;  // 30 s, per brief
const unsigned long SENSOR_PERIOD_MS      = 2000UL;   // DHT needs >= ~2 s
const unsigned long STATUS_PERIOD_MS      = 1000UL;

// ------------------------------------------------------------------ State
DHT dht(PIN_DHT, DHT_TYPE);

bool isDark       = false;
bool motionNow    = false;
bool everMoved    = false;     // false until the first motion after boot
bool occupied     = false;
bool lightOn      = false;
bool fanOn        = false;
float tempC       = NAN;
int  ldrRaw       = 0;

unsigned long lastMotionMs = 0;
unsigned long lastSensorMs = 0;
unsigned long lastStatusMs = 0;

// --------------------------------------------------------------- Helpers
bool readIsDark(bool previous) {
  int raw = analogRead(PIN_LDR);
  ldrRaw = raw;
#if !LDR_HIGH_MEANS_BRIGHT
  raw = 1023 - raw;           // normalise so that high = bright
#endif
  if (raw < LDR_DARK_BELOW)   return true;
  if (raw > LDR_BRIGHT_ABOVE) return false;
  return previous;            // inside the band: keep previous classification
}

void applyOutputs() {
  digitalWrite(PIN_LIGHT, lightOn ? HIGH : LOW);
  digitalWrite(PIN_FAN,   fanOn   ? HIGH : LOW);
}

void printStatus() {
  Serial.print(F("[t="));
  Serial.print(millis() / 1000UL);
  Serial.print(F("s] LDR="));
  Serial.print(ldrRaw);
  Serial.print(isDark ? F(" (DARK)") : F(" (BRIGHT)"));
  Serial.print(F(" | Motion="));
  Serial.print(motionNow ? F("YES") : F("NO"));
  Serial.print(F(" | Occupied="));
  Serial.print(occupied ? F("YES") : F("NO"));
  Serial.print(F(" | Temp="));
  if (isnan(tempC)) Serial.print(F("n/a"));
  else { Serial.print(tempC, 1); Serial.print(F("C")); }
  Serial.print(F(" | Light="));
  Serial.print(lightOn ? F("ON") : F("OFF"));
  Serial.print(F(" | Fan="));
  Serial.print(fanOn ? F("ON") : F("OFF"));
  if (occupied) {
    unsigned long idle = millis() - lastMotionMs;
    Serial.print(F(" | Idle="));
    Serial.print(idle / 1000UL);
    Serial.print(F("s/"));
    Serial.print(INACTIVITY_TIMEOUT_MS / 1000UL);
    Serial.print('s');
  }
  Serial.println();
}

// ----------------------------------------------------------------- Setup
void setup() {
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_LIGHT, OUTPUT);
  pinMode(PIN_FAN, OUTPUT);
  applyOutputs();             // both OFF at boot

  Serial.begin(9600);
  dht.begin();

  Serial.println(F("Smart Classroom Energy Management System"));
  Serial.println(F("Fan: ON >30C, OFF <27C, hold 27-30C | Timeout: 30 s"));

  isDark = readIsDark(false);
  float t = dht.readTemperature();
  if (!isnan(t)) tempC = t;
}

// ------------------------------------------------------------------ Loop
void loop() {
  const unsigned long now = millis();

  // 1. Motion: sampled every pass so short pulses are not missed.
  motionNow = (digitalRead(PIN_PIR) == HIGH);
  if (motionNow) {
    lastMotionMs = now;       // reset the inactivity timer
    everMoved = true;
  }

  // 2. Slow sensors (DHT cannot be polled faster than ~0.5 Hz).
  if (now - lastSensorMs >= SENSOR_PERIOD_MS || lastSensorMs == 0) {
    lastSensorMs = now;
    float t = dht.readTemperature();
    if (!isnan(t)) tempC = t;         // keep last good value on a failed read
  }
  isDark = readIsDark(isDark);

  // 3. Occupancy = recent motion (PIR detects motion, not presence).
  occupied = everMoved && (now - lastMotionMs < INACTIVITY_TIMEOUT_MS);

  // 4. Decision rules.
  if (!occupied) {
    lightOn = false;          // inactivity shutdown (also initial idle state)
    fanOn   = false;
  } else {
    lightOn = isDark;         // dark AND occupied

    if (!isnan(tempC)) {
      if (tempC > TEMP_FAN_ON_ABOVE)       fanOn = true;
      else if (tempC < TEMP_FAN_OFF_BELOW) fanOn = false;
      // 27..30 C inclusive: fanOn unchanged (hysteresis)
    }
  }
  applyOutputs();

  // 5. Status report.
  if (now - lastStatusMs >= STATUS_PERIOD_MS) {
    lastStatusMs = now;
    printStatus();
  }
}
