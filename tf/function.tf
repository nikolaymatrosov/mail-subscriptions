resource "null_resource" "build_typescript" {
  provisioner "local-exec" {
    command = "cd ../src && npm run build && cd .. && cp package*.json ./dist/ && cp -r ./src/templates ./dist/templates"
  }
  triggers = {
    always_run = timestamp()
  }
}

data "archive_file" "function_files" {
  output_path = "./function.zip"
  source_dir  = "../dist"
  type        = "zip"
  depends_on = [
    null_resource.build_typescript
  ]
}

resource "yandex_function" "api_function" {
  name              = "${local.app_prefix}api-function"
  user_hash         = data.archive_file.function_files.output_sha256
  runtime           = "nodejs18"
  entrypoint        = "api/app.handler"
  memory            = "128"
  execution_timeout = "10"
  content {
    zip_filename = data.archive_file.function_files.output_path
  }
  environment = {
    YDB_ENDPOINT = yandex_ydb_database_serverless.db.ydb_api_endpoint
    YDB_DATABASE = yandex_ydb_database_serverless.db.database_path
  }
  service_account_id = yandex_iam_service_account.accounts["api"].id
  secrets {
    environment_variable = "CAPTCHA_SECRET"
    id                   = data.yandex_lockbox_secret_version.captcha_secret.secret_id
    key                  = "server-key"
    version_id           = data.yandex_lockbox_secret_version.captcha_secret.id
  }
  depends_on = [
    yandex_ydb_database_serverless.db,
  ]
}


data "yandex_lockbox_secret_version" "captcha_secret" {
  secret_id  = var.captcha_secret_id
  # version_id = var.captcha_secret_version_id
}

resource "yandex_function" "worker_function" {
  name              = "${local.app_prefix}api-worker"
  user_hash         = data.archive_file.function_files.output_sha256
  runtime           = "nodejs18"
  entrypoint        = "worker/send.handler"
  memory            = "128"
  execution_timeout = "10"
  content {
    zip_filename = data.archive_file.function_files.output_path
  }
  environment = {
    YDB_ENDPOINT = yandex_ydb_database_serverless.db.ydb_api_endpoint
    YDB_DATABASE = yandex_ydb_database_serverless.db.database_path
  }
  service_account_id = yandex_iam_service_account.accounts["worker"].id

  depends_on = [
    yandex_ydb_database_serverless.db,
  ]
}

# resource "yandex_function_trigger" "cdc_trigger" {
#   name = "${local.app_prefix}cdc-trigger"
#
#   data_streams {
#     batch_cutoff       = "1"
#     database           = yandex_ydb_database_serverless.db.database_path
#     service_account_id = yandex_iam_service_account.accounts["cdc-trigger"].id
#     stream_name        = "events/events_feed"
#   }
#   function {
#     id = yandex_function.worker_function.id
#     service_account_id = yandex_iam_service_account.accounts["cdc-trigger"].id
#   }
#   depends_on = [
#     null_resource.migrations
#   ]
# }

resource "yandex_serverless_eventrouter_bus" "cdc_router" {
  name      = "${local.app_prefix}cdc-router"
  folder_id = var.folder_id
}

resource "yandex_serverless_eventrouter_connector" "cdc_connector" {
  name   = "${local.app_prefix}cdc-connector"
  bus_id = yandex_serverless_eventrouter_bus.cdc_router.id
  depends_on = [
    yandex_serverless_eventrouter_bus.cdc_router,
    null_resource.migrations
  ]

  yds {
    consumer           = "eventrouter"
    database           = yandex_ydb_database_serverless.db.database_path
    stream_name        = "events/events_feed"
    service_account_id = yandex_iam_service_account.accounts["cdc-trigger"].id
  }
}

resource "yandex_serverless_eventrouter_rule" "cdc_rule" {
  name   = "${local.app_prefix}cdc-rule"
  bus_id = yandex_serverless_eventrouter_bus.cdc_router.id
  depends_on = [
    yandex_serverless_eventrouter_connector.cdc_connector
  ]

  jq_filter = <<EOF
.newImage.payload.type == "SubscriptionCreated"
EOF

  function {
    function_id        = yandex_function.worker_function.id
    service_account_id = yandex_iam_service_account.accounts["cdc-trigger"].id
  }
}


