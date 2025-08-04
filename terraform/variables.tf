variable "budget_notification_emails" {
  description = "List of email addresses to receive AWS Budget notifications"
  type        = list(string)
  default     = [
    "liambarkley.bbd@gmail.com",
    "rudolphe@bbdsoftware.com"
  ]
}