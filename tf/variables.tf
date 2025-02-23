variable "cloud_id" {
  type = string
}

variable "folder_id" {
  type = string
}

variable "zone" {
  type    = string
  default = "ru-central1-a"
}

variable "captcha_secret_id" {
  default = ""
}

variable "captcha_secret_version_id" {
  default = ""
}
