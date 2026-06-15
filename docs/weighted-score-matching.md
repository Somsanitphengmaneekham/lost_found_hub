# Weighted Score Matching

แนวทางนี้เป็นเวอร์ชันง่ายสำหรับทำในเวลาจำกัด โดยไม่ต้องสร้างระบบ matching engine ซับซ้อน แต่ให้บันทึกผลที่คะแนนผ่านเกณฑ์ลงตาราง `matches` เพื่อให้หน้าเว็บเปิดดูรายการแนะนำได้เร็วขึ้น และอธิบายกับอาจารย์ได้ว่าระบบเคยจับคู่รายการใดไว้แล้ว

โปรเจกต์นี้ใช้ React + Node.js ได้เลย ไม่ต้องใช้ PHP

## หลักการให้คะแนน

| เงื่อนไข | คะแนน |
| --- | ---: |
| ประเภทสิ่งของตรงกัน | 40 |
| สถานที่ตรงกัน | 25 |
| วันที่ใกล้กันไม่เกิน 3 วัน | 20 |
| สีหรือรายละเอียดใกล้เคียงกัน | 15 |
| รวม | 100 |

ถ้าคะแนนรวม `>= 70` ให้แสดงข้อความว่า `พบรายการที่อาจตรงกัน` และบันทึกผลลงตาราง `matches` ด้วยสถานะเริ่มต้น `suggested`

## ตาราง matches

ตารางนี้เก็บผลลัพธ์ของ Weighted Score Matching หลังคำนวณแล้ว ไม่ต้องคำนวณใหม่ทุกครั้งที่เปิดหน้าเว็บ

```sql
CREATE TABLE matches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lost_post_id INT UNSIGNED NOT NULL,
  found_post_id INT UNSIGNED NOT NULL,
  match_score DECIMAL(5,2) NOT NULL,
  status ENUM('suggested','confirmed','rejected') NOT NULL DEFAULT 'suggested',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  KEY idx_matches_lost_post_id (lost_post_id),
  KEY idx_matches_found_post_id (found_post_id),

  CONSTRAINT fk_matches_lost_post
    FOREIGN KEY (lost_post_id) REFERENCES lost_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_matches_found_post
    FOREIGN KEY (found_post_id) REFERENCES found_posts(id)
    ON UPDATE CASCADE ON DELETE CASCADE
);
```

ความหมายของ `status`:

- `suggested` คือ ระบบคำนวณแล้วพบว่าอาจตรงกัน
- `confirmed` คือ อาจารย์หรือผู้ดูแลยืนยันว่าตรงกันจริง
- `rejected` คือ ตรวจแล้วไม่ใช่รายการเดียวกัน

## ทำไมต้อง Query Candidate ก่อน

ห้ามดึงทุก record มา loop เทียบทั้งหมด เพราะถ้าข้อมูลเยอะจะช้า

ให้คัดรายการที่มีโอกาสตรงกันก่อน เช่น:

- ประเภทเดียวกัน
- วันที่ใกล้กัน เช่น +-7 วัน
- สถานที่เดียวกัน หรือสีเดียวกัน
- สถานะของพบต้องเป็นรายการที่ประกาศแล้ว เช่น `approved`

## Candidate Query ตัวอย่าง

```sql
SELECT *
FROM found_posts
WHERE status IN ('approved', 'matched')
  AND category_id = :category_id
  AND (
    :lost_at IS NULL
    OR found_at BETWEEN DATE_SUB(:lost_at, INTERVAL 7 DAY)
                    AND DATE_ADD(:lost_at, INTERVAL 7 DAY)
  )
  AND (
    :lost_location_id IS NULL
    OR found_location_id = :lost_location_id
    OR :color IS NULL
    OR color = :color
  )
ORDER BY found_at DESC
LIMIT 50;
```

## Pseudo Code แบบ JavaScript

```js
let score = 0;

if (lost.category_id === found.category_id) {
  score += 40;
}

if (lost.lost_location_id === found.found_location_id) {
  score += 25;
}

if (dateDiff(lost.lost_at, found.found_at) <= 3) {
  score += 20;
}

if (lost.color === found.color || detailSimilar(lost, found)) {
  score += 15;
}

if (score >= 70) {
  await saveToMatches(lost.id, found.id, score);
  return "พบรายการที่อาจตรงกัน";
}
```

## ไฟล์ Node.js ตัวอย่าง

ดูไฟล์ตัวอย่างได้ที่:

`backend/src/services/weightedScoreMatching.js`

API ตัวอย่างสำหรับ React เรียกใช้:

`backend/src/examples/matching-api-example.js`

วิธีลองบน XAMPP:

1. Import `database/lost_found_hub_xampp_mysql.sql` ใน phpMyAdmin
2. เปิด XAMPP MySQL ให้ทำงาน
3. รัน backend:

```bash
npm install
npm run server:matching
```

4. เปิด URL เช่น:

```text
http://localhost:3001/api/matches/1
```

ระบบจะคืน JSON ของรายการที่คะแนนเกิน 70 และบันทึกผลไว้ในตาราง `matches`

## React เรียก API ตัวอย่าง

```js
async function loadMatches(lostPostId) {
  const response = await fetch(`http://localhost:3001/api/matches/${lostPostId}`);
  const data = await response.json();
  return data.matches;
}
```

## หมายเหตุ

ตัวอย่าง Node.js จะ query candidate ก่อน แล้วค่อยคำนวณคะแนนทีละรายการ หากคะแนนถึงเกณฑ์จะบันทึกลง `matches` เพื่อให้ React สามารถดึงรายการแนะนำมาแสดงซ้ำได้โดยไม่ต้องให้ระบบคำนวณใหม่ทั้งหมดทุกครั้ง
