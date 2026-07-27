require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const PORT = process.env.PORT || 3000;

if (!JWT_SECRET || !ADMIN_PASSWORD_HASH) {
  console.error(
    "ERREUR : il manque JWT_SECRET ou ADMIN_PASSWORD_HASH dans votre fichier .env.\n" +
    "Lancez d'abord : node scripts/set-admin-password.js \"votre_mot_de_passe\"\n" +
    "puis copiez le résultat dans .env (voir .env.example)."
  );
  process.exit(1);
}

// ---------- Middleware d'authentification admin ----------
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

// ---------- Routes publiques ----------

// Liste des voyages, sans exposer de détails internes
app.get('/api/trips', (req, res) => {
  const data = db.read();
  const trips = data.trips.map(t => ({
    id: t.id,
    destFr: t.destFr,
    destAr: t.destAr,
    date: t.date,
    price: t.price,
    totalSeats: t.totalSeats,
    remainingSeats: Math.max(0, t.totalSeats - t.bookedSeats)
  }));
  res.json(trips);
});

// Créer une demande de réservation (vérifie et réserve les places de façon atomique)
app.post('/api/bookings', async (req, res) => {
  const { tripId, name, phone, seats } = req.body;
  const seatsNum = parseInt(seats, 10);

  if (!tripId || !name || !phone || !seatsNum || seatsNum < 1) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const result = await db.transaction((data) => {
    const trip = data.trips.find(t => t.id === tripId);
    if (!trip) return { ok: false, error: 'trip_not_found' };

    const remaining = trip.totalSeats - trip.bookedSeats;
    if (remaining <= 0) return { ok: false, error: 'full' };
    if (seatsNum > remaining) return { ok: false, error: 'not_enough_seats', remaining };

    trip.bookedSeats += seatsNum;
    const request = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      tripId,
      tripDestFr: trip.destFr,
      tripDestAr: trip.destAr,
      name: String(name).slice(0, 120),
      phone: String(phone).slice(0, 40),
      seats: seatsNum,
      timestamp: new Date().toISOString()
    };
    data.requests.push(request);
    return { ok: true, request };
  });

  if (!result.ok) {
    const status = result.error === 'trip_not_found' ? 404 : 409;
    return res.status(status).json(result);
  }
  res.status(201).json(result.request);
});

// ---------- Auth admin ----------
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'invalid_input' });

  const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!match) return res.status(401).json({ error: 'wrong_password' });

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// ---------- Routes admin protégées ----------

app.get('/api/admin/requests', requireAdmin, (req, res) => {
  const data = db.read();
  res.json(data.requests.slice().reverse());
});

app.post('/api/admin/trips', requireAdmin, async (req, res) => {
  const { destFr, destAr, date, price, totalSeats } = req.body;
  if (!destFr || !date || !totalSeats) return res.status(400).json({ error: 'invalid_input' });

  const trip = await db.transaction((data) => {
    const newTrip = {
      id: 't_' + Date.now(),
      destFr: String(destFr).slice(0, 120),
      destAr: String(destAr || '').slice(0, 120),
      date,
      price: parseInt(price, 10) || 0,
      totalSeats: parseInt(totalSeats, 10),
      bookedSeats: 0
    };
    data.trips.push(newTrip);
    return newTrip;
  });
  res.status(201).json(trip);
});

app.put('/api/admin/trips/:id', requireAdmin, async (req, res) => {
  const { destFr, destAr, date, price, totalSeats } = req.body;
  const result = await db.transaction((data) => {
    const trip = data.trips.find(t => t.id === req.params.id);
    if (!trip) return { ok: false };
    if (destFr !== undefined) trip.destFr = String(destFr).slice(0, 120);
    if (destAr !== undefined) trip.destAr = String(destAr).slice(0, 120);
    if (date !== undefined) trip.date = date;
    if (price !== undefined) trip.price = parseInt(price, 10) || 0;
    if (totalSeats !== undefined) trip.totalSeats = parseInt(totalSeats, 10);
    return { ok: true, trip };
  });
  if (!result.ok) return res.status(404).json({ error: 'trip_not_found' });
  res.json(result.trip);
});

app.delete('/api/admin/trips/:id', requireAdmin, async (req, res) => {
  await db.transaction((data) => {
    data.trips = data.trips.filter(t => t.id !== req.params.id);
  });
  res.status(204).end();
});

// ---------- Fichiers statiques (frontend) ----------
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Club Rihla backend en écoute sur http://localhost:${PORT}`);
});
