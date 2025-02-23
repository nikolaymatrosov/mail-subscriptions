locals {
  service_accounts = {
    invoker = [
      "serverless.functions.invoker",
    ],
    api = [
      "ydb.editor",
      "lockbox.payloadViewer",
    ],
    worker = [
      "ydb.editor",
      "postbox.sender",
    ],
    cdc-trigger = [
      "functions.functionInvoker",
      "yds.admin",
    ],
  }

  bindings = flatten([
    for account_name, acc_roles in local.service_accounts : [
      for role in acc_roles : {
        account_name = account_name
        role         = role
      }
    ]
  ])
}

resource "yandex_iam_service_account" "accounts" {
  for_each  = local.service_accounts
  name      = "${local.app_prefix}${each.key}"
  folder_id = var.folder_id
}

resource "yandex_resourcemanager_folder_iam_binding" "api_sa" {
  for_each = {
    for index, binding in local.bindings : index => binding
  }
  role      = each.value.role
  folder_id = var.folder_id
  members = [
    "serviceAccount:${yandex_iam_service_account.accounts[each.value.account_name].id}",
  ]
}
