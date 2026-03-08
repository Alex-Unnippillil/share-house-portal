provider "aws" {
  region  = var.region
  profile = var.aws_profile

  default_tags {
    tags = merge(
      {
        ManagedBy = "terraform"
        Project   = var.project
      },
      var.tags
    )
  }
}
