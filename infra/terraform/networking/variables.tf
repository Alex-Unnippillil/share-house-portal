variable "azs" {
  description = "List of availability zones to spread networking resources across."
  type        = list(string)

  validation {
    condition     = length(var.azs) >= 3
    error_message = "At least three availability zones are required."
  }
}

variable "environments" {
  description = <<EOT
Map of environment names to networking configuration. Each environment must provide a parent VPC CIDR block and can optionally override the computed subnet CIDRs or add extra tags.
EOT
  type = map(object({
    cidr_block           = string
    public_subnet_cidrs  = optional(list(string))
    private_subnet_cidrs = optional(list(string))
    tags                 = optional(map(string), {})
  }))

  validation {
    condition = alltrue([
      for env, cfg in var.environments :
      tonumber(split(cfg.cidr_block, "/")[1]) <= 24
    ])
    error_message = "Each environment VPC CIDR block must allow creation of at least /28 subnets."
  }
}

variable "common_tags" {
  description = "Tags applied to every resource created by this module."
  type        = map(string)
  default     = {}
}
