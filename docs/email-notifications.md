# Email notifications

The system uses the same Gmail SMTP configuration as password reset OTP.

## Events

- A new lost post emails every active teacher with a valid email address. The email includes the post title, reporter name, location, pending status, and a direct approval link.
- A new found post emails every active teacher with a valid email address. The email includes the post title, reporter name, location, pending status, and a direct approval link.
- Approving a lost/found post emails the student who created it.
- Rejecting a lost/found post emails the student who created it.
- Password reset OTP emails include a direct link back to the forgot-password page.
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

Teacher approval emails use:

```text
APP_PUBLIC_URL + /#approval
```

Example:

```text
http://127.0.0.1:5173/#approval
```

In production, change `APP_PUBLIC_URL` to the real website domain so the teacher can open the link from Gmail and go directly to the approval page.

Password reset emails use:

```text
APP_PUBLIC_URL + /#forgot-password
```

Every system email should include a direct website link, either as a button in the HTML email or as a plain text URL fallback.

Email delivery runs after the database action. A temporary Gmail error does not cancel a post or approval; the backend writes the delivery result to its server log.
