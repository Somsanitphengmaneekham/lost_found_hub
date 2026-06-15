USE lost_found_hub;

START TRANSACTION;

UPDATE departments
SET code = 'SCI',
    name_th = 'ພາກວິຊາວິທະຍາສາດ',
    name_en = 'Science'
WHERE id = 1;

UPDATE departments
SET code = 'MATH',
    name_th = 'ພາກວິຊາຄະນິດສາດ',
    name_en = 'Mathematics'
WHERE id = 2;

UPDATE departments
SET code = 'PHY-CHEM',
    name_th = 'ພາກວິຊາຟີຊິກ ແລະ ເຄມີ',
    name_en = 'Physics and Chemistry'
WHERE id = 3;

UPDATE item_categories
SET name_th = 'ອິເລັກໂທຣນິກ',
    description = 'ໂທລະສັບ ຫູຟັງ ສາຍສາກ ແລະ ອຸປະກອນໄອທີ'
WHERE id = 1;

UPDATE item_categories
SET name_th = 'ກະເປົາ/ເອກະສານ',
    description = 'ກະເປົາ ປຶ້ມ ເອກະສານ ແລະ ແຟ້ມ'
WHERE id = 2;

UPDATE item_categories
SET name_th = 'ກະແຈ/ບັດ',
    description = 'ກະແຈ ບັດນັກສຶກສາ ແລະ ບັດຜ່ານ'
WHERE id = 3;

UPDATE item_categories
SET name_th = 'ຕຸກນ້ຳ',
    description = 'ແກ້ວນ້ຳ ຕຸກນ້ຳ ແລະ ກະຕິກນ້ຳ'
WHERE id = 4;

UPDATE item_categories
SET name_th = 'ອື່ນໆ',
    description = 'ລາຍການທີ່ບໍ່ຢູ່ໃນໝວດໝູ່ທີ່ກຳນົດ'
WHERE id = 5;

UPDATE locations
SET name_th = 'ຫ້ອງຄຸ້ມຄອງ',
    building = 'ຄະນະວິທະຍາສາດທຳມະຊາດ',
    floor = '1',
    detail = 'ຈຸດຮັບຝາກ ແລະ ສົ່ງມອບສິ່ງຂອງ',
    location_type = 'handover'
WHERE id = 1;

UPDATE locations
SET name_th = 'ຕຶກພາກວິຊາວິທະຍາສາດ',
    building = 'ຄະນະວິທະຍາສາດທຳມະຊາດ',
    floor = NULL,
    detail = 'ພື້ນທີ່ຫ້ອງຮຽນ ຫ້ອງປະຕິບັດການ ແລະ ທາງເດີນ',
    location_type = 'both'
WHERE id = 2;

UPDATE locations
SET name_th = 'ຕຶກພາກວິຊາຄະນິດສາດ',
    building = 'ຄະນະວິທະຍາສາດທຳມະຊາດ',
    floor = NULL,
    detail = 'ພື້ນທີ່ຫ້ອງຮຽນ ແລະ ທາງເດີນຂອງພາກວິຊາ',
    location_type = 'both'
WHERE id = 3;

UPDATE locations
SET name_th = 'ຕຶກພາກວິຊາຟີຊິກ ແລະ ເຄມີ',
    building = 'ຄະນະວິທະຍາສາດທຳມະຊາດ',
    floor = NULL,
    detail = 'ພື້ນທີ່ຫ້ອງຮຽນ ຫ້ອງທົດລອງ ແລະ ທາງເດີນ',
    location_type = 'both'
WHERE id = 4;

UPDATE locations
SET name_th = 'ລານກາງຄະນະ',
    building = 'ຄະນະວິທະຍາສາດທຳມະຊາດ',
    floor = NULL,
    detail = 'ພື້ນທີ່ກາງແຈ້ງ ແລະ ຈຸດນັ່ງພັກ',
    location_type = 'both'
WHERE id = 5;

UPDATE members
SET first_name = 'ອາຈານ',
    last_name = 'ຫ້ອງຄຸ້ມຄອງ',
    phone = '020-1111-2222',
    department_id = 1
WHERE username = 'teacher01';

UPDATE members
SET first_name = 'ນັກສຶກສາ',
    last_name = 'ຕົວຢ່າງ',
    phone = '020-3333-4444',
    department_id = 1
WHERE username = 'student01';

UPDATE lost_posts
SET title = 'ກະເປົາເປ້ສີເທົາ',
    description = 'ມີປຶ້ມຈົດບັນທຶກ ແລະ ສາຍສາກຢູ່ດ້ານໃນ',
    color = 'ສີເທົາ',
    unique_mark = 'ມີພວງກະແຈສີຟ້າຕິດຢູ່',
    contact_name = 'ນັກສຶກສາ ຕົວຢ່າງ'
WHERE id = 1;

UPDATE found_posts
SET title = 'ຫູຟັງ AirPods Pro',
    description = 'ເຄສສີຂາວ ພົບໃກ້ໂຕະອ່ານປຶ້ມ',
    color = 'ສີຂາວ',
    unique_mark = 'ມີຮອຍນ້ອຍຢູ່ດ້ານຫຼັງເຄສ'
WHERE id = 1;

UPDATE found_posts
SET title = 'ກະແຈຫ້ອງພັກ',
    description = 'ພວງກະແຈມີຣີໂມດສີດຳ ແລະ ກະແຈ 2 ດອກ',
    color = 'ສີດຳ/ເງິນ',
    unique_mark = 'ມີຣີໂມດສີດຳຕິດກັບພວງກະແຈ'
WHERE id = 2;

UPDATE found_posts
SET title = 'ກະເປົາເປ້ສີເທົາ',
    description = 'ພົບກະເປົາເປ້ສີເທົາບໍລິເວນຕຶກພາກວິຊາຄະນິດສາດ',
    color = 'ສີເທົາ',
    unique_mark = 'ມີພວງກະແຈສີຟ້າຕິດຢູ່'
WHERE id = 3;

COMMIT;
