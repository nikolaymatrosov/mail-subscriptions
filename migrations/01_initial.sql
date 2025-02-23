-- +goose Up
-- +goose StatementBegin
CREATE TABLE subscriptions (
    id Utf8,
    email Utf8,
    ip Utf8,
    verified Bool,
    created_at Timestamp,
    verified_at Timestamp,
    INDEX subscriptions_email GLOBAL UNIQUE SYNC ON (email),
    INDEX subscriptions_ip GLOBAL SYNC ON (ip),
    PRIMARY KEY (id)
);
CREATE TABLE events (
    id Utf8,
    created_at Timestamp,
    subscription_id Utf8,
    payload JSONDocument,
    INDEX events_subscription_id GLOBAL SYNC ON (subscription_id),
    PRIMARY KEY (id)
);

ALTER TABLE `events` ADD CHANGEFEED `events_feed` WITH (
    FORMAT = 'JSON',
    MODE = 'NEW_AND_OLD_IMAGES'
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE subscriptions;
DROP TABLE events;
-- +goose StatementEnd
