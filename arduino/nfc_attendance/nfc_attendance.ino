/**
 * BusTracker — NFC Attendance System
 *
 * Hardware:
 *   - ESP32 or ESP8266
 *   - RC522 RFID/NFC Reader
 *     → SDA  → D5 (GPIO 5)
 *     → SCK  → D18 (GPIO 18)
 *     → MOSI → D23 (GPIO 23)
 *     → MISO → D19 (GPIO 19)
 *     → RST  → D22 (GPIO 22)
 *     → 3.3V → 3.3V
 *     → GND  → GND
 *   - Buzzer (optional) → D2
 *   - LED Green → D4, LED Red → D0
 *
 * Libraries (install via Arduino Library Manager):
 *   - MFRC522   by GithubCommunity
 *   - WiFi / HTTPClient (ESP32 built-in)
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ── Config ────────────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Replace with your PC's local IP
const char* SERVER_URL    = "http://192.168.1.100:3000/api/attendance/scan";
const char* BUS_ID        = "YOUR_BUS_ID_FROM_DB";
const char* DEVICE_KEY    = "arduino-secret-key-123";

// ── Pins ──────────────────────────────────────────────────────────────────────
#define SS_PIN   5
#define RST_PIN  22
#define BUZZER   2
#define LED_GREEN 4
#define LED_RED   0

MFRC522 mfrc522(SS_PIN, RST_PIN);

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();

  pinMode(BUZZER, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  Serial.println("\n🔖 BusTracker NFC Attendance Starting...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n✅ WiFi: " + WiFi.localIP().toString());
  Serial.println("Ready — waiting for NFC cards...");

  // Ready signal
  beep(100); delay(100); beep(100);
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

  // Read card UID
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (i > 0) uid += "";
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  Serial.println("\n📛 Card detected: " + uid);
  sendScan(uid);

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(1500);  // Debounce — prevent double scan
}

void sendScan(String uid) {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); return; }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"nfcCardId\":\"" + uid + "\","
                + "\"busId\":\"" + String(BUS_ID) + "\","
                + "\"deviceKey\":\"" + String(DEVICE_KEY) + "\"}";

  int code = http.POST(body);
  String response = http.getString();
  http.end();

  if (code == 200) {
    // Parse status from response (contains "BOARDED" or "EXITED")
    bool boarded = response.indexOf("BOARDED") >= 0;
    Serial.println(boarded ? "✅ Student BOARDED" : "👋 Student EXITED");

    if (boarded) {
      // Green flash + 1 beep
      digitalWrite(LED_GREEN, HIGH);
      beep(200);
      delay(500);
      digitalWrite(LED_GREEN, LOW);
    } else {
      // Red flash + 2 beeps
      digitalWrite(LED_RED, HIGH);
      beep(150); delay(100); beep(150);
      delay(500);
      digitalWrite(LED_RED, LOW);
    }
  } else {
    Serial.println("❌ Scan failed. HTTP: " + String(code) + " → " + response);
    // Error — 3 fast beeps
    for (int i = 0; i < 3; i++) { beep(80); delay(80); }
  }
}

void beep(int ms) {
  digitalWrite(BUZZER, HIGH);
  delay(ms);
  digitalWrite(BUZZER, LOW);
}
