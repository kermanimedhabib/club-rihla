// Base de données simple basée sur un fichier JSON.
// Suffisant pour un club de voyages (quelques dizaines/centaines de voyages et demandes).
// Peut être remplacée plus tard par Postgres/MySQL sans changer le reste de l'API
// si le volume grandit beaucoup — mais pour ce cas d'usage, un fichier JSON est fiable et simple.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const seed = {
      trips: [
        { id: 't1', destFr: "Tassili n'Ajjer", destAr: 'الطاسيلي ناجر', date: '2026-09-12', price: 45000, totalSeats: 14, bookedSeats: 0 },
        { id: 't2', destFr: 'Chréa, Blida', destAr: 'شريعة، البليدة', date: '2026-08-02', price: 6000, totalSeats: 20, bookedSeats: 0 },
        { id: 't3', destFr: 'Béjaïa & Cap Carbon', destAr: 'بجاية ورأس كاربون', date: '2026-08-20', price: 9000, totalSeats: 16, bookedSeats: 0 }
      ],
      requests: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  }
}

// Verrou d'écriture simple en mémoire pour éviter que deux réservations
// simultanées ne cassent le compteur de places.
let writeQueue = Promise.resolve();

function read() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function write(data) {
  writeQueue = writeQueue.then(() => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  });
  return writeQueue;
}

// Exécute une transaction atomique : lit, modifie via `fn`, puis écrit.
// Les opérations sont mises en file d'attente donc deux appels concurrents
// ne peuvent pas lire le même état "avant modification".
async function transaction(fn) {
  let result;
  writeQueue = writeQueue.then(async () => {
    const data = read();
    result = await fn(data);
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  });
  await writeQueue;
  return result;
}

module.exports = { read, write, transaction, ensureDb };
