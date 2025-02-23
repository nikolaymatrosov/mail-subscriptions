-- +goose Up
-- +goose StatementBegin
ALTER TOPIC `events/events_feed` ADD CONSUMER eventrouter WITH (important = true);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TOPIC `events/events_feed` DROP CONSUMER eventrouter;
-- +goose StatementEnd
