data "aws_region" "current" {}

locals {
  env_configs = {
    for env, cfg in var.environments :
    env => {
      cidr_block = cfg.cidr_block
      tags       = merge(var.common_tags, try(cfg.tags, {}), { Environment = env })
      public_subnet_cidrs = (
        try(length(cfg.public_subnet_cidrs), 0) == length(var.azs)
        ? cfg.public_subnet_cidrs
        : [for idx in range(length(var.azs)) : cidrsubnet(cfg.cidr_block, 4, idx)]
      )
      private_subnet_cidrs = (
        try(length(cfg.private_subnet_cidrs), 0) == length(var.azs)
        ? cfg.private_subnet_cidrs
        : [for idx in range(length(var.azs)) : cidrsubnet(cfg.cidr_block, 4, idx + length(var.azs))]
      )
    }
  }

  public_subnets = {
    for env, cfg in local.env_configs :
    for idx, cidr in cfg.public_subnet_cidrs :
    "${env}-${idx}" => {
      env   = env
      index = idx
      cidr  = cidr
      az    = element(var.azs, idx)
    }
  }

  private_subnets = {
    for env, cfg in local.env_configs :
    for idx, cidr in cfg.private_subnet_cidrs :
    "${env}-${idx}" => {
      env   = env
      index = idx
      cidr  = cidr
      az    = element(var.azs, idx)
    }
  }
}

resource "aws_vpc" "this" {
  for_each = local.env_configs

  cidr_block           = each.value.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(each.value.tags, {
    Name = "${each.key}-vpc"
  })
}

resource "aws_internet_gateway" "this" {
  for_each = aws_vpc.this

  vpc_id = each.value.id

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-igw"
  })
}

resource "aws_subnet" "public" {
  for_each = local.public_subnets

  vpc_id                  = aws_vpc.this[each.value.env].id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = true

  tags = merge(local.env_configs[each.value.env].tags, {
    Name = "${each.value.env}-public-${each.value.az}"
    Tier = "public"
  })
}

resource "aws_subnet" "private" {
  for_each = local.private_subnets

  vpc_id            = aws_vpc.this[each.value.env].id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = merge(local.env_configs[each.value.env].tags, {
    Name = "${each.value.env}-private-${each.value.az}"
    Tier = "private"
  })
}

resource "aws_eip" "nat" {
  for_each = local.public_subnets

  domain = "vpc"

  tags = merge(local.env_configs[each.value.env].tags, {
    Name = "${each.value.env}-nat-eip-${each.value.az}"
  })
}

resource "aws_nat_gateway" "this" {
  for_each = local.public_subnets

  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = aws_subnet.public[each.key].id

  depends_on = [aws_internet_gateway.this[each.value.env]]

  tags = merge(local.env_configs[each.value.env].tags, {
    Name = "${each.value.env}-nat-${each.value.az}"
  })
}

resource "aws_route_table" "public" {
  for_each = aws_vpc.this

  vpc_id = each.value.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this[each.key].id
  }

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  for_each = local.public_subnets

  subnet_id      = aws_subnet.public[each.key].id
  route_table_id = aws_route_table.public[each.value.env].id
}

resource "aws_route_table" "private" {
  for_each = local.private_subnets

  vpc_id = aws_vpc.this[each.value.env].id

  tags = merge(local.env_configs[each.value.env].tags, {
    Name = "${each.value.env}-private-rt-${each.value.az}"
  })
}

resource "aws_route" "private_nat" {
  for_each = local.private_subnets

  route_table_id         = aws_route_table.private[each.key].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this["${each.value.env}-${each.value.index}"].id
}

resource "aws_route_table_association" "private" {
  for_each = local.private_subnets

  subnet_id      = aws_subnet.private[each.key].id
  route_table_id = aws_route_table.private[each.key].id
}

resource "aws_security_group" "app" {
  for_each = aws_vpc.this

  name        = "${each.key}-app-sg"
  description = "Allow inbound HTTP/S traffic for application services"
  vpc_id      = each.value.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-app-sg"
  })
}

resource "aws_security_group" "db" {
  for_each = aws_vpc.this

  name        = "${each.key}-db-sg"
  description = "Allow database access from application security group"
  vpc_id      = each.value.id

  ingress {
    description     = "PostgreSQL"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app[each.key].id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-db-sg"
  })
}

resource "aws_security_group" "endpoints" {
  for_each = aws_vpc.this

  name        = "${each.key}-endpoints-sg"
  description = "Restrict VPC endpoint access to the VPC CIDR"
  vpc_id      = each.value.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.this[each.key].cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.this[each.key].cidr_block]
  }

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-endpoints-sg"
  })
}

resource "aws_vpc_endpoint" "s3" {
  for_each = aws_vpc.this

  vpc_id            = each.value.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [
    for key, subnet in local.private_subnets :
    aws_route_table.private[key].id if subnet.env == each.key
  ]

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-s3-endpoint"
  })
}

resource "aws_vpc_endpoint" "dynamodb" {
  for_each = aws_vpc.this

  vpc_id            = each.value.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [
    for key, subnet in local.private_subnets :
    aws_route_table.private[key].id if subnet.env == each.key
  ]

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-dynamodb-endpoint"
  })
}

resource "aws_vpc_endpoint" "ecr_api" {
  for_each = aws_vpc.this

  vpc_id              = each.value.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [for key, subnet in local.private_subnets : aws_subnet.private[key].id if subnet.env == each.key]
  security_group_ids  = [aws_security_group.endpoints[each.key].id]
  private_dns_enabled = true

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-ecr-api-endpoint"
  })
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  for_each = aws_vpc.this

  vpc_id              = each.value.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [for key, subnet in local.private_subnets : aws_subnet.private[key].id if subnet.env == each.key]
  security_group_ids  = [aws_security_group.endpoints[each.key].id]
  private_dns_enabled = true

  tags = merge(local.env_configs[each.key].tags, {
    Name = "${each.key}-ecr-dkr-endpoint"
  })
}
