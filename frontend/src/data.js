import airpodsImage from "./assets/airpods.svg";
import keysImage from "./assets/keys.svg";
import tumblerImage from "./assets/tumbler.svg";
import walletImage from "./assets/wallet.svg";

export const categoryMasterSeed = [
  {
    id: 1,
    name: "ອິເລັກໂທຣນິກ",
    description: "ໂທລະສັບ ຫູຟັງ ສາຍສາກ ອຸປະກອນໄອທີ",
    isActive: true,
  },
  {
    id: 2,
    name: "ກະເປົາ/ເອກະສານ",
    description: "ກະເປົາ ປຶ້ມ ເອກະສານ ແຟ້ມ",
    isActive: true,
  },
  {
    id: 3,
    name: "ກະແຈ/ບັດ",
    description: "ກະແຈ ບັດນັກສຶກສາ ບັດຜ່ານ",
    isActive: true,
  },
  {
    id: 4,
    name: "ຕຸກນ້ຳ",
    description: "ຈອກນ້ຳ ຕຸກນ້ຳ ກະຕິກນ້ຳ",
    isActive: true,
  },
  {
    id: 5,
    name: "ອື່ນໆ",
    description: "ລາຍການທີ່ບໍ່ຢູ່ໃນໝວດໝູ່ທີ່ກຳນົດ",
    isActive: true,
  },
];

export const locationMasterSeed = [
  {
    id: 1,
    name: "ຫ້ອງຄຸ້ມຄອງ",
    building: "ຫ້ອງການຄະນະວິທະຍາສາດທໍາມະຊາດ",
    floor: "1",
    locationType: "handover",
    detail: "ຈຸດຮັບຝາກ ແລະ ສົ່ງມອບສິ່ງຂອງ",
    isActive: true,
  },
  {
    id: 2,
    name: "ຕຶກພາກວິຊາວິທະຍາສາດ",
    building: "ພາກວິຊາວິທະຍາສາດ",
    floor: "",
    locationType: "both",
    detail: "ບໍລິເວນຫ້ອງຮຽນ ຫ້ອງປະຕິບັດການ ແລະ ໂຖງທາງເດີນ",
    isActive: true,
  },
  {
    id: 3,
    name: "ຕຶກພາກວິຊາຄະນິດສາດ",
    building: "ພາກວິຊາຄະນິດສາດ",
    floor: "",
    locationType: "both",
    detail: "ບໍລິເວນຫ້ອງຮຽນ ແລະ ໂຖງທາງເດີນ",
    isActive: true,
  },
  {
    id: 4,
    name: "ຕຶກພາກວິຊາຟີຊິກ ແລະ ເຄມີ",
    building: "ພາກວິຊາຟີຊິກ ແລະ ເຄມີ",
    floor: "",
    locationType: "both",
    detail: "ບໍລິເວນຫ້ອງຮຽນ ຫ້ອງທົດລອງ ແລະ ໂຖງທາງເດີນ",
    isActive: true,
  },
  {
    id: 5,
    name: "ລານກາງຄະນະ",
    building: "ຄະນະວິທະຍາສາດທໍາມະຊາດ",
    floor: "",
    locationType: "both",
    detail: "ພື້ນທີ່ພັກນັກສຶກສາ ແລະ ທາງເຊື່ອມລະຫວ່າງຕຶກ",
    isActive: true,
  },
];

export const departmentMasterSeed = [
  { id: 1, code: "SCI", name: "ພາກວິຊາວິທະຍາສາດ", nameEn: "Science", isActive: true },
  { id: 2, code: "MATH", name: "ພາກວິຊາຄະນິດສາດ", nameEn: "Mathematics", isActive: true },
  { id: 3, code: "PHY-CHEM", name: "ພາກວິຊາຟີຊິກ ແລະ ເຄມີ", nameEn: "Physics and Chemistry", isActive: true },
];

export const categories = ["ທັງໝົດ", ...categoryMasterSeed.map((item) => item.name)];
export const locations = locationMasterSeed.map((item) => item.name);
export const departments = departmentMasterSeed.map((item) => item.name);

export const authMembers = [
  {
    id: 1,
    role: "teacher",
    username: "teacher01",
    password: "123456",
    studentCode: "",
    employeeCode: "T001",
    firstName: "ອາຈານ",
    lastName: "ຕົວຢ່າງ",
    fullName: "ອາຈານ ຕົວຢ່າງ",
    email: "teacher01@example.com",
    phone: "020-1111-2222",
    department: "ພາກວິຊາວິທະຍາສາດ",
    identityStatus: "verified",
    cardImageUrl: "",
  },
  {
    id: 2,
    role: "student",
    username: "student01",
    password: "123456",
    studentCode: "66000001",
    employeeCode: "",
    firstName: "ນັກສຶກສາ",
    lastName: "ຕົວຢ່າງ",
    fullName: "ນັກສຶກສາ ຕົວຢ່າງ",
    email: "student01@example.com",
    phone: "020-3333-4444",
    department: "ພາກວິຊາວິທະຍາສາດ",
    identityStatus: "verified",
    cardImageUrl: "student-card-sample.jpg",
  },
];

export const foundSeed = [];

export const lostSeed = [];

export const matchSeed = [];

export const statusMeta = {
  awaiting_handover: {
    label: "ລໍຖ້າສົ່ງຫ້ອງຄຸ້ມຄອງ",
    tone: "amber",
    helper: "ຜູ້ພົບຍັງບໍ່ໄດ້ສົ່ງຂອງໃຫ້ຫ້ອງຄຸ້ມຄອງ",
  },
  pending_approval: {
    label: "ລໍຖ້າອາຈານອະນຸມັດ",
    tone: "blue",
    helper: "ສົ່ງຂອງແລ້ວ ລໍຖ້າອາຈານກວດສອບ",
  },
  approved: {
    label: "ປະກາດແລ້ວ",
    tone: "green",
    helper: "ສະແດງຢູ່ໜ້າເວັບແລ້ວ",
  },
  matched: {
    label: "ຈັບຄູ່ແລ້ວ",
    tone: "purple",
    helper: "ພົບລາຍການທີ່ອາດກົງກັບຂອງສູນຫາຍ",
  },
  returned: {
    label: "ຄືນຂອງແລ້ວ",
    tone: "slate",
    helper: "ບັນທຶກໃນ return_records ແລ້ວ",
  },
  rejected: {
    label: "ປະຕິເສດ",
    tone: "red",
    helper: "ຂໍ້ມູນບໍ່ຄົບ ຫຼື ບໍ່ຜ່ານການກວດສອບ",
  },
};

export function imageForCategory(category) {
  const fallbackImages = {
    "ອິເລັກໂທຣນິກ": airpodsImage,
    "ກະເປົາ/ເອກະສານ": walletImage,
    "ກະແຈ/ບັດ": keysImage,
    "ຕຸກນ້ຳ": tumblerImage,
  };

  return fallbackImages[category] || walletImage;
}
