output "vpc_ids" {
  description = "VPC identifiers keyed by environment name."
  value = {
    for env, vpc in aws_vpc.this :
    env => vpc.id
  }
}

output "public_subnet_ids" {
  description = "Public subnet identifiers keyed by environment and AZ index."
  value = {
    for key, subnet in aws_subnet.public :
    key => subnet.id
  }
}

output "private_subnet_ids" {
  description = "Private subnet identifiers keyed by environment and AZ index."
  value = {
    for key, subnet in aws_subnet.private :
    key => subnet.id
  }
}

output "security_groups" {
  description = "Security group identifiers for application, database, and endpoint access per environment."
  value = {
    for env, _ in aws_vpc.this :
    env => {
      app       = aws_security_group.app[env].id
      database  = aws_security_group.db[env].id
      endpoints = aws_security_group.endpoints[env].id
    }
  }
}
