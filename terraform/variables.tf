variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
  default     = "instamastadongram"
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository"
  type        = string
  default     = "NoTablesAttached/InstaMastadonGram"
}

variable "budget_notification_emails" {
  description = "List of email addresses to receive AWS Budget notifications"
  type        = list(string)
  default     = [
    "joy@bbd.co.za",
    "Liam.Barkley@bbd.co.za",
    "Clive.Mmakola@bbd.co.za",
    "Katleho.Myeza@bbd.co.za"
  ]
}