output "public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.app.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.project_name}-key.pem ec2-user@${aws_eip.app.public_ip}"
}

output "app_url" {
  description = "URL to access the application"
  value       = "http://${aws_eip.app.public_ip}"
}

output "backend_ecr_repository_url" {
  description = "ECR repository URL for backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repository_url" {
  description = "ECR repository URL for frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "backend_ecr_repository_name" {
  description = "ECR repository name for backend image"
  value       = aws_ecr_repository.backend.name
}

output "frontend_ecr_repository_name" {
  description = "ECR repository name for frontend image"
  value       = aws_ecr_repository.frontend.name
}
