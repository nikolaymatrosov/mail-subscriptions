-- +goose Up
-- +goose StatementBegin
CREATE TABLE verifications
(
    event_id        Utf8,
    subscription_id Utf8,
    created_at      Timestamp,
    sent_at         Timestamp,
    PRIMARY KEY (event_id)
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE verifications;
-- +goose StatementEnd
