-- Faculty of Natural Sciences master data seed for XAMPP / MySQL.
-- Import this after database/lost_found_hub_xampp_mysql.sql if the database already exists.

USE lost_found_hub;
SET NAMES utf8mb4;

UPDATE departments
SET is_active = 0
WHERE code IN ('SCI', 'PHY-CHEM');

INSERT INTO departments (code, name_th, name_en, is_active) VALUES
  ('BIO', 'ພາກວິຊາ ຊີວະວິທະຍາ', 'Biology', 1),
  ('CHEM', 'ພາກວິຊາ ເຄມີສາດ', 'Chemistry', 1),
  ('PHYS', 'ພາກວິຊາ ຟີຊິກສາດ', 'Physics', 1),
  ('MATH', 'ພາກວິຊາ ຄະນິດສາດ ແລະ ສະຖິຕິ', 'Mathematics and Statistics', 1),
  ('CS', 'ພາກວິຊາ ວິທະຍາສາດຄອມພິວເຕີ', 'Computer Science', 1)
ON DUPLICATE KEY UPDATE
  name_th = VALUES(name_th),
  name_en = VALUES(name_en),
  is_active = VALUES(is_active);

UPDATE members
SET department_id = (SELECT id FROM departments WHERE code = 'CS' LIMIT 1)
WHERE username IN ('teacher01', 'student01');

UPDATE locations
SET floor = ''
WHERE name_th IN ('ຫ້ອງຄຸ້ມຄອງ', 'ລານກາງຄະນະ');

UPDATE locations
SET is_active = 0
WHERE name_th IN (
  'ຕຶກພາກວິຊາວິທະຍາສາດ',
  'ຕຶກພາກວິຊາຄະນິດສາດ',
  'ຕຶກພາກວິຊາຟີຊິກ ແລະ ເຄມີ'
);

INSERT INTO locations (name_th, building, floor, detail, location_type, is_active) VALUES
  ('ຫ້ອງຄຸ້ມຄອງ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', '', 'ຈຸດຮັບຝາກ ແລະ ສົ່ງມອບສິ່ງຂອງ', 'handover', 1),
  ('ລານກາງຄະນະ', 'ຄະນະວິທະຍາສາດທຳມະຊາດ', '', 'ພື້ນທີ່ກາງແຈ້ງ ແລະ ຈຸດນັ່ງພັກ', 'both', 1),
  ('BI106 - ຫ້ອງ Media', 'ຕຶກ BI ຕຶກທົດລອງ', '', 'ຫ້ອງ Media', 'both', 1),
  ('BI107 - ຫ້ອງປະຕິບັດການ', 'ຕຶກ BI ຕຶກທົດລອງ', '', 'ຫ້ອງປະຕິບັດການ', 'both', 1),
  ('BI108 - ຫ້ອງຮຽນ', 'ຕຶກ BI ຕຶກທົດລອງ', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('BI109 - ຫ້ອງຮຽນ', 'ຕຶກ BI ຕຶກທົດລອງ', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('BI110 - ຫ້ອງຮຽນ', 'ຕຶກ BI ຕຶກທົດລອງ', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('BI111 - ຫ້ອງຮຽນ', 'ຕຶກ BI ຕຶກທົດລອງ', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('BI112 - SIC Samsung Innovation Campus', 'ຕຶກ BI ຕຶກທົດລອງ', '', 'SIC Samsung Innovation Campus', 'both', 1),
  ('CH - ຫ້ອງທົດລອງພາກເຄມີ', 'ອາຄານຫ້ອງທົດລອງວິທະຍາສາດທຳມະຊາດ', '', 'ຫ້ອງທົດລອງພາກເຄມີ', 'both', 1),
  ('CH100 - ຫ້ອງພັກຄູ', 'ອາຄານຫ້ອງທົດລອງວິທະຍາສາດທຳມະຊາດ', '', 'ຫ້ອງພັກຄູ', 'both', 1),
  ('CH101 - ພາກວິຊາເຄມີສາດ', 'ອາຄານຫ້ອງທົດລອງວິທະຍາສາດທຳມະຊາດ', '', 'ພາກວິຊາເຄມີສາດ', 'both', 1),
  ('CH102 - ຫ້ອງຮຽນ', 'ອາຄານຫ້ອງທົດລອງວິທະຍາສາດທຳມະຊາດ', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('CH103 - ຫ້ອງທົດລອງເປົ່າແກ້ວ', 'ອາຄານຫ້ອງທົດລອງວິທະຍາສາດທຳມະຊາດ', '', 'ຫ້ອງທົດລອງເປົ່າແກ້ວ', 'both', 1),
  ('ຫ້ອງທົດລອງ ຟີຊິກສາດ', 'ອາຄານຫ້ອງທົດລອງວິທະຍາສາດທຳມະຊາດ', '', 'ຫ້ອງທົດລອງ ຟີຊິກສາດ', 'both', 1),
  ('PH101 - ຫ້ອງພັກຄູ', 'ຫ້ອງທົດລອງ ຟີຊິກສາດ', '', 'ຫ້ອງພັກຄູ', 'both', 1),
  ('PH102 - ຫ້ອງຮຽນ', 'ຫ້ອງທົດລອງ ຟີຊິກສາດ', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('PH103 - ຫ້ອງພັກຄູ', 'ຫ້ອງທົດລອງ ຟີຊິກສາດ', '', 'ຫ້ອງພັກຄູ', 'both', 1),
  ('PH104 - ຫ້ອງຮຽນ', 'ຫ້ອງທົດລອງ ຟີຊິກສາດ', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('PH105 - ຫ້ອງຮຽນ', 'ຫ້ອງທົດລອງ ຟີຊິກສາດ', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('CS001 - ຫ້ອງຮຽນ', 'ຕຶກ CS', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('CS002 - ຫ້ອງພັກຄູ + ຫ້ອງອາຈານ', 'ຕຶກ CS', '', 'ຫ້ອງພັກຄູ + ຫ້ອງອາຈານ', 'both', 1),
  ('CS003 - ຫ້ອງຮຽນ', 'ຕຶກ CS', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('CS004 - ຫ້ອງພັກຄູ + ຫ້ອງອາຈານ', 'ຕຶກ CS', '', 'ຫ້ອງພັກຄູ + ຫ້ອງອາຈານ', 'both', 1),
  ('CS005 - ຫ້ອງຮຽນ', 'ຕຶກ CS', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('CS006 - ຫ້ອງ Robot', 'ຕຶກ CS', '', 'ຫ້ອງ Robot', 'both', 1),
  ('CS007 - ຫ້ອງຮຽນ', 'ຕຶກ CS', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('MA101 - ຫ້ອງສະໝຸດ', 'ຕຶກ MA', '', 'ຫ້ອງສະໝຸດ', 'both', 1),
  ('MA102 - ຫ້ອງການສະມາຄົມ', 'ຕຶກ MA', '', 'ຫ້ອງການສະມາຄົມ', 'both', 1),
  ('MA103 - ຫ້ອງຮຽນ', 'ຕຶກ MA', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('MA104 - ຫ້ອງຮຽນ', 'ຕຶກ MA', '', 'ຫ້ອງຮຽນ', 'both', 1),
  ('MA105 - ຫ້ອງຮຽນ / ຫ້ອງອາຈານ + ຫ້ອງພັກຄູ', 'ຕຶກ MA', '', 'ຂໍ້ມູນຫ້ອງ MA105 ລະບຸທັງຫ້ອງຮຽນ ແລະ ຫ້ອງອາຈານ + ຫ້ອງພັກຄູ', 'both', 1),
  ('MA106 - ຫ້ອງຫົວໜ້າໜ່ວຍ + ຫ້ອງອາຈານ', 'ຕຶກ MA', '', 'ຫ້ອງຫົວໜ້າໜ່ວຍ + ຫ້ອງອາຈານ', 'both', 1),
  ('MA107 - ຫ້ອງຄະນະພາກ + ຫ້ອງອາຈານ', 'ຕຶກ MA', '', 'ຫ້ອງຄະນະພາກ + ຫ້ອງອາຈານ', 'both', 1)
ON DUPLICATE KEY UPDATE
  detail = VALUES(detail),
  location_type = VALUES(location_type),
  is_active = VALUES(is_active);
