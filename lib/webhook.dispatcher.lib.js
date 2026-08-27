import { Client } from 'pg';
import axios from 'axios';
import { configDotenv } from 'dotenv';
configDotenv();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function fetchEvent(eventId) {
  const { rows } = await client.query(
    `SELECT e.id, e.event_type, e.payload,
            s.target_url
     FROM webhook_events e
     JOIN webhook_subscriptions s ON s.id = e.subscription_id
     WHERE e.id = $1 AND e.status = 'pending'`,
    [eventId]
  );
  return rows[0]; // undefined if already handled or doesn't exist
}

async function markDelivered(eventId, status, error = null) {
  await client.query(
    `UPDATE webhook_events
     SET status = $1, delivered_at = now(), error = $2
     WHERE id = $3`,
    [status, error, eventId]
  );
}

async function dispatchWebhook(eventId) {
  const event = await fetchEvent(eventId);
  if (!event) return; // already processed, or was deleted — nothing to do

  try {
    await axios.post(event.target_url, event.payload, {
      timeout: 5000,
    });
    await markDelivered(event.id, 'success');
  } catch (err) {
    // One attempt only, per current scope — no retry/backoff yet.
    await markDelivered(event.id, 'failed', err.message);
  }
}

async function catchUpOnStartup() {
  // Covers events inserted while the dispatcher was down or restarting —
  // NOTIFY does not queue messages for a disconnected listener.
  const { rows } = await client.query(
    `SELECT id FROM webhook_events WHERE status = 'pending'`
  );
  for (const row of rows) {
    await dispatchWebhook(row.id);
  }
}

async function start() {
  await client.connect();
  await client.query('LISTEN webhook_channel');

  client.on('notification', (msg) => {
    dispatchWebhook(msg.payload);
  });

  client.on('error', (err) => {
    console.error('Dispatcher DB connection error:', err.message);
    process.exit(1); // let a process manager (pm2/systemd) restart & re-run catch-up
  });

  await catchUpOnStartup();

  console.log('Webhook dispatcher listening on webhook_channel');
}

start().catch((err) => {
  console.error('Dispatcher failed to start:', err);
  process.exit(1);
});