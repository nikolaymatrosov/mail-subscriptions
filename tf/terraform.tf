terraform {
  backend "local" {
    path = "../environment/terraform.tfstate"
  }
  required_providers {
    yandex = {
      source = "yandex-cloud/yandex"
      version = ">= 0.138"
    }
    null = {
      source  = "hashicorp/null"
      version = "3.2.2"
    }
  }
  required_version = ">= 0.13"
}

provider "yandex" {
  cloud_id  = var.cloud_id
  folder_id = var.folder_id
  zone      = var.zone
}
