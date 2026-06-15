# Project Structure

โครงสร้างนี้แยก Frontend และ Backend ออกจากกันชัดเจน เพื่อให้อ่านโค้ดและอธิบายงานกับอาจารย์ได้ง่ายขึ้น

```text
lost-found-hub/
├─ frontend/
│  ├─ index.html
│  ├─ vite.config.js
│  └─ src/
│     ├─ api/                 # ฟังก์ชันเรียก API จาก Backend
│     ├─ assets/              # รูปภาพและไฟล์ประกอบ UI
│     ├─ components/          # Component ที่ใช้ซ้ำ
│     │  ├─ common/
│     │  ├─ layout/
│     │  └─ master-data/
│     ├─ hooks/               # React hooks สำหรับแยก logic
│     ├─ pages/               # แต่ละหน้าของเว็บไซต์
│     ├─ utils/               # helper ฝั่ง Frontend
│     ├─ App.jsx
│     └─ main.jsx
│
├─ backend/
│  └─ src/
│     ├─ config/              # การตั้งค่า เช่น database connection
│     ├─ examples/            # ไฟล์ตัวอย่าง API แยกเฉพาะเรื่อง
│     ├─ routes/              # Express routes แยกตาม module
│     ├─ services/            # business logic เช่น matching, lookup
│     ├─ utils/               # helper ฝั่ง Backend
│     └─ index.js             # จุดเริ่มต้นของ Backend API
│
├─ database/                  # SQL schema และ seed data
├─ design-reference/          # รูปตัวอย่าง UX/UI
├─ docs/                      # เอกสารอธิบายระบบ
├─ scripts/                   # script ช่วยรันโปรเจกต์
├─ package.json
└─ package-lock.json
```

## คำสั่งที่ใช้เหมือนเดิม

```bash
npm run dev
npm run server
npm run dev:full
npm run build
```

## การแบ่งหน้าที่

- `frontend/` รับผิดชอบหน้าจอ, form, navigation, validation ฝั่งผู้ใช้ และการเรียก API
- `backend/` รับผิดชอบ API, database query, authentication, approval, matching และ return records
- `database/` เก็บโครงสร้างฐานข้อมูลสำหรับ XAMPP/MySQL
- `docs/` เก็บเอกสารประกอบ เช่น database design, matching logic และโครงสร้างโปรเจกต์
