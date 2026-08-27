CREATE TABLE webhook_subscriptions (
    id             SERIAL PRIMARY KEY,
    agent_id       INTEGER NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    target_folder  UUID NOT NULL REFERENCES folders(folder_id) ON DELETE CASCADE,
    event_type     TEXT NOT NULL,        -- e.g. 'file.uploaded'
    target_url     TEXT NOT NULL,
    enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_subscriptions_lookup
    ON webhook_subscriptions (target_folder, event_type)
    WHERE enabled = TRUE;

-- The outbox: one row per event that actually needs to be sent.
-- Only ever inserted into by the main server. Only ever updated by the dispatcher.
CREATE TABLE webhook_events (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- reuses uuid-ossp, already enabled in folder.model.sql
    subscription_id  INTEGER NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event_type       TEXT NOT NULL,
    payload          JSONB NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at     TIMESTAMPTZ,
    error            TEXT
);

CREATE INDEX idx_webhook_events_pending
    ON webhook_events (status)
    WHERE status = 'pending';

-- Fires on every insert, wakes up any dispatcher process that's LISTENing.
-- Only the event id is sent — dispatcher fetches the row itself.
CREATE OR REPLACE FUNCTION notify_webhook_event() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('webhook_channel', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_event_insert
    AFTER INSERT ON webhook_events
    FOR EACH ROW EXECUTE FUNCTION notify_webhook_event();