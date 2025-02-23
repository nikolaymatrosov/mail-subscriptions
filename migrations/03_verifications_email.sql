-- +goose Up
-- +goose StatementBegin
ALTER TABLE verifications ADD COLUMN email Utf8;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE verifications DROP COLUMN email;
-- +goose StatementEnd
