# วิธีเปิดใช้งานระบบลืมรหัสผ่านแบบส่ง OTP จริง

ระบบลืมรหัสผ่านทำงานเป็น 3 ขั้นตอน:

1. ผู้ใช้กรอกชื่อผู้ใช้หรืออีเมล
2. ระบบส่ง OTP ไปยัง Gmail/Email ที่บันทึกไว้ในบัญชี
3. ผู้ใช้กรอก OTP แล้วตั้งรหัสผ่านใหม่

## 1. ตั้งค่าให้ส่ง OTP ไป Gmail จริง

ให้สร้างไฟล์ `.env` ที่ root project โดยคัดลอกจาก `.env.example` แล้วใส่ค่าต่อไปนี้:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
SMTP_FROM=your-email@gmail.com
OTP_DEV_MODE=false
```

ข้อสำคัญ:

- `SMTP_USER` คือ Gmail ที่ใช้ส่ง OTP
- `SMTP_PASS` ไม่ใช่รหัสผ่าน Gmail ปกติ แต่ต้องเป็น Google App Password
- `OTP_DEV_MODE=false` เพื่อไม่ให้ระบบแสดง OTP บนหน้าเว็บ

## 2. วิธีสร้าง Google App Password

1. เปิดบัญชี Google ของ Gmail ที่จะใช้ส่ง OTP
2. เปิดใช้งาน 2-Step Verification ก่อน
3. เข้าเมนู App passwords
4. สร้าง App Password สำหรับ Mail
5. นำรหัส 16 ตัวที่ได้มาใส่ใน `SMTP_PASS`

หลังแก้ `.env` แล้วต้อง restart backend:

```bash
npm run server
```

หรือถ้าใช้พร้อม frontend:

```bash
npm run dev:full
```

## 3. โหมดทดสอบในเครื่อง

ถ้ายังไม่มี Gmail App Password สามารถเปิดโหมดทดสอบได้:

```env
OTP_DEV_MODE=true
```

โหมดนี้จะไม่ส่ง OTP จริง แต่จะแสดง OTP บนหน้าเว็บ เพื่อให้ทดสอบระบบได้ครบ flow เท่านั้น

ก่อนนำไป demo จริงหรือใช้งานจริง ต้องตั้งกลับเป็น:

```env
OTP_DEV_MODE=false
```

## 4. ตารางฐานข้อมูลที่ใช้

ระบบใช้ตาราง `password_reset_otps` สำหรับเก็บข้อมูล OTP แบบ hash ไม่ได้เก็บ OTP ตัวเลขตรง ๆ

ถ้าฐานข้อมูลมีอยู่แล้ว ให้ import:

```text
database/alter_password_reset_otps.sql
```

ถ้า import ฐานข้อมูลใหม่ทั้งก้อน ให้ใช้:

```text
database/lost_found_hub_xampp_mysql.sql
```
