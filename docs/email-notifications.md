# Email notifications

The system uses the same Gmail SMTP configuration as password reset OTP.

## Events

- A new lost post emails every active teacher with a valid email address.
- A new found post emails every active teacher with a valid email address.
- Approving a lost/found post emails the student who created it.
- Rejecting a lost/found post emails the student who created it.
- In-app notifications continue to appear on the Notifications page.

## Environment

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
SMTP_FROM=your-email@gmail.com
NOTIFICATION_EMAIL_ENABLED=true
APP_PUBLIC_URL=http://127.0.0.1:5173
```

Set `APP_PUBLIC_URL` to the deployed website URL before production deployment.
Teacher and student accounts must have real email addresses in `members.email`.

Email delivery runs after the database action. A temporary Gmail error does not cancel a post or approval; the backend writes the delivery result to its server log.
