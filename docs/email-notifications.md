# Email notifications

The system uses the same Gmail SMTP configuration as password reset OTP.
In-app notifications are written to the `notifications` table together with each email event (read/unread).

## Events (designed cases)

### Student

| Case (wireframe) | Trigger | In-app + email |
| --- | --- | --- |
| ລໍຖ້າອາຈານກວດສອບ | Lost/found post submitted | Author receipt (`notifyAuthorOfSubmissionPending`) |
| ປະກາດຖືກອະນຸມັດ / ປະຕິເສດ | Approve/reject lost or found | Author (`notifyPostAuthorOfDecision`) |
| ລາຍການອາດກົງກັນ | Suggested matches after approval | Lost owners (`notifyLostOwnersOfFoundMatches`) |
| ລໍຖ້າອາຈານກວດສອບ (claim) | Claim submitted | Claimant (`notifyTeachersOfClaimRequest`) |
| ຢືນຢັນຕົວຕົນແລ້ວ | Claim approved | Claimant (`notifyClaimantOfDecision`) |
| ສົ່ງຄືນສຳເລັດ | Return recorded (found-post or match path) | Claimant + finder (`notifyClaimantOfReturn`) |
| Match confirmed / rejected | Match status change | Owner + finder |
| Mark lost as found | Teacher mark-found | Lost owner |

### Teacher

| Case (wireframe) | Trigger | In-app + email |
| --- | --- | --- |
| ມີປະກາດໃໝ່ລໍຖ້າອະນຸມັດ | New lost/found (+ move-to-approval) | Teachers (`notifyTeachersOfPostSubmission`) |
| ບັດນັກສຶກສາລໍຖ້າກວດສອບ | Claim submitted (identity check) | Teachers (`notifyTeachersOfClaimRequest`) |
| ຕ້ອງບັນທຶກການສົ່ງຄືນ | Claim approved or match confirmed | Teachers (`notifyTeachersOfReturnNeeded`) |

### Other

- Password reset OTP emails include a direct link back to the forgot-password page (auth mailer, not the notifications feed).
- Approved claim emails include pickup location and service hours (`PICKUP_LOCATION`, `PICKUP_HOURS`).

## Environment

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
SMTP_FROM=your-email@gmail.com
NOTIFICATION_EMAIL_ENABLED=true
APP_PUBLIC_URL=http://127.0.0.1:5173
PICKUP_LOCATION=ຫ້ອງຄຸ້ມຄອງ
PICKUP_HOURS=ຈັນ–ສຸກ 08:00–16:00
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
