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

