/**
 * BusTracker — Arduino GPS Tracker
 *
 * Hardware:
 *   - Arduino Uno / Mega / ESP8266 / ESP32
 *   - NEO-6M GPS Module  → TX→D4, RX→D3
 *   - ESP8266 WiFi Module (if using Uno) OR use ESP32/ESP8266 directly
 *
 * Libraries (install via Arduino Library Manager):
 *   - TinyGPS++     by Mikal Hart
 *   - SoftwareSerial (built-in)
 *   - ESP8266WiFi / WiFi (depending on board)
 *   - ESP8266HTTPClient / HTTPClient
 */

#include <TinyGPS++.h>
#include <SoftwareSerial.h>

// ── WiFi / Board selection ────────────────────────────────────────────────────
// Uncomment the right one for your board:
// #include <ESP8266WiFi.h>
// #include <ESP8266HTTPClient.h>
#include <WiFi.h>           // ESP32
#include <HTTPClient.h>     // ESP32

// ── Config ────────────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Replace with your PC's local IP (find with ipconfig on Windows)
const char* SERVER_URL    = "http://192.168.1.100:3000/api/attendance/gps";
const char* BUS_ID        = "YOUR_BUS_ID_FROM_DB";
const char* DEVICE_KEY    = "arduino-secret-key-123";

const int   SEND_INTERVAL = 5000;  // Send GPS every 5 seconds

// ── GPS ───────────────────────────────────────────────────────────────────────
static const int GPS_RX = 16, GPS_TX = 17;  // Adjust for your wiring
SoftwareSerial gpsSerial(GPS_RX, GPS_TX);
TinyGPSPlus gps;

unsigned long lastSent = 0;

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600);

  Serial.println("\n🚌 BusTracker GPS Starting...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n✅ WiFi connected: " + WiFi.localIP().toString());
}

void loop() {
  // Feed GPS data
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  if (millis() - lastSent >= SEND_INTERVAL) {
    lastSent = millis();

    if (gps.location.isValid()) {
      sendLocation(gps.location.lat(), gps.location.lng(), gps.speed.kmph());
    } else {
      Serial.println("⚠️  Waiting for GPS fix...");
    }
  }
}

void sendLocation(double lat, double lng, double speed) {
  if (WiFi.status() != WL_CONNECTED) { Serial.println("WiFi disconnected, reconnecting..."); WiFi.reconnect(); return; }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"busId\":\"" + String(BUS_ID) + "\","
                + "\"lat\":" + String(lat, 6) + ","
                + "\"lng\":" + String(lng, 6) + ","
                + "\"speed\":" + String(speed, 1) + ","
                + "\"deviceKey\":\"" + String(DEVICE_KEY) + "\"}";

  int code = http.POST(body);

  if (code == 200) {
    Serial.println("✅ Location sent: " + String(lat, 6) + ", " + String(lng, 6));
  } else {
    Serial.println("❌ Failed to send. HTTP: " + String(code));
  }

  http.end();
}
