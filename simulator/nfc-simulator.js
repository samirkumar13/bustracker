/**
 * BusTracker — NFC Attendance Simulator
 *
 * Pretends to be the Arduino RC522 NFC reader.
 * Lets you type a card UID in the terminal to simulate a student tapping.
 *
 * Usage:
 *   node nfc-simulator.js
 *
 * Then type a card UID and press Enter to simulate a scan.
 * Use the card UIDs assigned to students in the Admin Dashboard → Users.
 */

const http = require('http');
const readline = require('readline');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;
const DEVICE_KEY  = 'arduino-secret-key-123';
const BUS_ID      = process.env.BUS_ID || 'cmpz44rar000bkmv7olehpymn';

function postScan(nfcCardId) {
  const body = JSON.stringify({ nfcCardId, busId: BUS_ID, deviceKey: DEVICE_KEY });
  const opts = {
    hostname: SERVER_HOST, port: SERVER_PORT,
    path: '/api/attendance/scan',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };
  return new Promise((resolve) => {
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log(`\n🔖 BusTracker NFC Simulator`);
  console.log(`   Bus ID: ${BUS_ID}`);
  console.log(`   Server: http://${SERVER_HOST}:${SERVER_PORT}\n`);
  console.log('   Tip: assign NFC card UIDs to students in Admin → Users first.\n');
  console.log('─────────────────────────────────────────────────────');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  function prompt() {
    rl.question('\n📛  Enter card UID (or "q" to quit): ', async (input) => {
      const uid = input.trim().toUpperCase();
      if (uid === 'Q') { console.log('Bye!'); rl.close(); return; }
      if (!uid) { prompt(); return; }

      console.log(`   Scanning card: ${uid}...`);
      const result = await postScan(uid);

      if (result.status === 200) {
        const data = JSON.parse(result.body);
        const icon = data.status === 'BOARDED' ? '🟢' : '🔴';
        console.log(`   ${icon} ${data.student} — ${data.status}`);
        console.log(`   Time: ${new Date(data.timestamp).toLocaleTimeString()}`);
      } else if (result.status === 404) {
        console.log('   ❌  Card not registered. Assign it to a student in the admin dashboard first.');
      } else {
        console.log(`   ❌  Error ${result.status}: ${result.body}`);
      }

      prompt();
    });
  }

  prompt();
}

run();
