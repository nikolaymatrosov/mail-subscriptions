//
// Simple SmartCaptcha example.
//
// Does not work with React 19
resource "yandex_smartcaptcha_captcha" "subscription" {
  name                = "${local.app_prefix}subscription-captcha"
  complexity          = "MEDIUM"
  pre_check_type      = "CHECKBOX"
  challenge_type      = "IMAGE_TEXT"

  allowed_sites = [
    "deploy.local",
    "nikolaymatrosov.ru",
  ]
}
