output "api_gateway_endpoint" {
  value = yandex_api_gateway.api_gateway.domain
}

output "db_endpoint" {
  value = yandex_ydb_database_serverless.db.ydb_api_endpoint
}
output "db_name" {
  value = yandex_ydb_database_serverless.db.database_path
}

output "migrate" {
  value = "grpcs://${yandex_ydb_database_serverless.db.ydb_api_endpoint}${yandex_ydb_database_serverless.db.database_path}?go_query_mode=scripting&go_fake_tx=scripting&go_query_bind=declare,numeric"
}
