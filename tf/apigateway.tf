data "yandex_cm_certificate" "api_domain" {
  folder_id = var.folder_id
  name      = "blog"
}

resource "yandex_api_gateway" "api_gateway" {
  name = "${local.app_prefix}api-gateway"
  custom_domains {
    certificate_id = data.yandex_cm_certificate.api_domain.id
    fqdn           = "blog.nikolaymatrosov.ru"
  }
  spec = templatefile("./api-gateway.yaml", {
    api_function  = yandex_function.api_function.id
    invoker_sa_id = yandex_iam_service_account.accounts["invoker"].id
  })
}
data "yandex_dns_zone" "root" {
  folder_id = var.folder_id
  name      = "nikolaymatrosov-ru"
}

resource "yandex_dns_recordset" "api_dns" {
  zone_id = data.yandex_dns_zone.root.id
  name    = "blog"
  type    = "CNAME"
  ttl     = 300
  data = [yandex_api_gateway.api_gateway.domain]
}
