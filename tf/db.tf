resource "yandex_ydb_database_serverless" "db" {
  name      = "${local.app_prefix}db"
  folder_id = var.folder_id
}

locals {
  dsn="grpcs://${yandex_ydb_database_serverless.db.ydb_api_endpoint}${yandex_ydb_database_serverless.db.database_path}?go_query_mode=scripting&go_fake_tx=scripting&go_query_bind=declare,numeric"
}

resource "null_resource" "migrations" {
  depends_on = [
    yandex_ydb_database_serverless.db
  ]

  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
      command = "cd ../migrations && goose ydb \"${local.dsn}&token=`yc iam create-token`\" up"
  }
}
