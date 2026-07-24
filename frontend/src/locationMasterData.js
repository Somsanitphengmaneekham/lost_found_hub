const FNS_FACULTY = "ຄະນະວິທະຍາສາດທຳມະຊາດ";
const BUILDING_CS = "ຕຶກ CS";
const BUILDING_MA = "ຕຶກ MA";
const BUILDING_BI = "ຕຶກ BI";
const BUILDING_FNS = "ຕຶກ FNS";
const BUILDING_SLB_CHEM = "SLB - ພາກເຄມີ";
const BUILDING_SLB_PHYSICS = "SLB - ພາກຟີຊິກ";
const BUILDING_SLB_BIOLOGY = "SLB - ພາກຊີວະສາດ";

function room(code, detail, building) {
  return {
    name: `${code} - ${detail}`,
    building,
    floor: "",
    locationType: "both",
    detail,
    isActive: true,
  };
}

function roomRange(prefix, start, end, detail, building) {
  return Array.from({ length: end - start + 1 }, (_, index) =>
    room(`${prefix}${String(start + index).padStart(3, "0")}`, detail, building),
  );
}

const locationRows = [
  {
    name: "ຫ້ອງຄຸ້ມຄອງ",
    building: FNS_FACULTY,
    floor: "",
    locationType: "handover",
    detail: "ຈຸດຮັບຝາກ ແລະ ສົ່ງມອບສິ່ງຂອງ",
    isActive: true,
  },
  {
    name: "ລານກາງຄະນະ",
    building: FNS_FACULTY,
    floor: "",
    locationType: "both",
    detail: "ພື້ນທີ່ກາງແຈ້ງ ແລະ ຈຸດນັ່ງພັກ",
    isActive: true,
  },

  ...["CS001", "CS003", "CS005", "CS007"].map((code) => room(code, "ຫ້ອງຮຽນ", BUILDING_CS)),
  ...["CS002", "CS004"].map((code) => room(code, "ຫ້ອງອາຈານ, ຫ້ອງພັກຄູ", BUILDING_CS)),
  room("CS006", "ຫ້ອງ Robot", BUILDING_CS),

  room("MA101", "ຫ້ອງສະໝຸດ", BUILDING_MA),
  room("MA102", "ຫ້ອງການສະມາຄົມ", BUILDING_MA),
  ...roomRange("MA", 103, 104, "ຫ້ອງຮຽນ", BUILDING_MA),
  room("MA105", "ຫ້ອງອາຈານ ຫ້ອງພັກຄູ", BUILDING_MA),
  room("MA106", "ຫ້ອງອາຈານ ຫ້ອງຫົວໜ້າໜ່ວຍ", BUILDING_MA),
  room("MA107", "ຫ້ອງອາຈານ ຫ້ອງຄະນະພາກ", BUILDING_MA),
  ...roomRange("MA", 201, 205, "ຫ້ອງຮຽນ", BUILDING_MA),

  room("BI106", "ຫ້ອງ Media", BUILDING_BI),
  room("BI107", "ຫ້ອງປະຕິບັດ", BUILDING_BI),
  room("BI108", "ຫ້ອງຮຽນ", BUILDING_BI),
  ...roomRange("BI", 109, 111, "ຫ້ອງທົດລອງ", BUILDING_BI),
  room("BI112", "SIC Samsung Innovation Campus", BUILDING_BI),

  room("FNS101", "ພະແນກຈັດຕັ້ງ - ສັງລວມ", BUILDING_FNS),
  room("FNS102", "ພະແນກຄຸ້ມຄອງນັກສຶກສາ", BUILDING_FNS),
  room("FNS103", "ພະແນກວິຊາການ", BUILDING_FNS),
  room("FNS104", "ພະແນກການເງິນ - ຊັບສິນ", BUILDING_FNS),
  room("FNS105", "ຫ້ອງອາຈານ", BUILDING_FNS),
  room("FNS106", "ພະແນກການເງິນ - ຊັບສິນ", BUILDING_FNS),
  ...roomRange("FNS", 107, 110, "ຫ້ອງຮຽນ", BUILDING_FNS),
  room("FNS201", "ຫ້ອງຄະນະບໍດີ", BUILDING_FNS),
  room("FNS-SEC", "ເລຂານຸການ", BUILDING_FNS),
  room("FNS202", "ຫ້ອງຮອງຄະນະບໍດີ", BUILDING_FNS),
  room("FNS203", "ຫ້ອງມູນເຊື້ອ", BUILDING_FNS),
  room("FNS204", "ຫ້ອງຮອງຄະນະບໍດີ", BUILDING_FNS),
  room("FNS205", "ຫ້ອງປະຊຸມ", BUILDING_FNS),
  room("FNS206", "ຫ້ອງອາຈານ", BUILDING_FNS),
  ...roomRange("FNS", 207, 210, "ຫ້ອງຮຽນ", BUILDING_FNS),
  room("FNS301", "ຫ້ອງພະແນກຄົ້ນຄວ້າວິທະຍາສາດທຳມະຊາດ", BUILDING_FNS),
  room("FNS302", "ຫ້ອງພັກຄູ", BUILDING_FNS),
  room("FNS303", "ພະແນກສຶກສາຫຼັງປ.ຕີ", BUILDING_FNS),
  room("FNS304", "ຫ້ອງພາກວິຊາວິທະຍາສາດຄອມພິວເຕີ", BUILDING_FNS),
  room("FNS305", "ຫ້ອງການພາກເຄມີ", BUILDING_FNS),
  room("FNS306", "ຫ້ອງອາຈານ", BUILDING_FNS),
  room("FNS307", "ຫ້ອງອາຈານ", BUILDING_FNS),
  room("FNS308", "ຫ້ອງພາກວິຊາຊີວະ", BUILDING_FNS),
  room("FNS309", "ຫ້ອງພາກວິຊາເຄມີສາດ", BUILDING_FNS),
  room("FNS310", "ຫ້ອງພາກວິຊາຟີຊິກສາດ", BUILDING_FNS),
  room("FNS311", "ຫ້ອງພາກວິຊາຄະນິດສາດ", BUILDING_FNS),
  ...roomRange("FNS", 312, 313, "ຫ້ອງຮຽນ", BUILDING_FNS),
  ...roomRange("FNS", 401, 405, "ຫ້ອງຮຽນ", BUILDING_FNS),

  room("CH101", "ຫ້ອງພັກຄູ", BUILDING_SLB_CHEM),
  ...roomRange("CH", 102, 102, "ຫ້ອງຮຽນ", BUILDING_SLB_CHEM),
  room("CH103", "ຫ້ອງເປົ່າແກ້ວ ຫ້ອງທົດລອງ", BUILDING_SLB_CHEM),
  ...roomRange("CH", 104, 105, "ຫ້ອງຮຽນ", BUILDING_SLB_CHEM),
  room("CH200", "ຫ້ອງພັກຄູ", BUILDING_SLB_CHEM),
  room("CH201", "ຫ້ອງຮຽນ", BUILDING_SLB_CHEM),
  room("CH203", "ຫ້ອງຮຽນ", BUILDING_SLB_CHEM),
  ...roomRange("CH", 301, 303, "ຫ້ອງຮຽນ", BUILDING_SLB_CHEM),

  room("PH101", "ຫ້ອງພັກຄູ", BUILDING_SLB_PHYSICS),
  ...roomRange("PH", 102, 102, "ຫ້ອງຮຽນ", BUILDING_SLB_PHYSICS),
  room("PH103", "ຫ້ອງພັກຄູ", BUILDING_SLB_PHYSICS),
  room("PH104", "ຫ້ອງຮຽນ", BUILDING_SLB_PHYSICS),
  room("PH105", "ຫ້ອງທົດລອງ", BUILDING_SLB_PHYSICS),
  ...roomRange("PH", 201, 202, "ຫ້ອງຮຽນ", BUILDING_SLB_PHYSICS),
  ...roomRange("PH", 203, 204, "ຫ້ອງອາຈານ", BUILDING_SLB_PHYSICS),
  room("PH205", "ຫ້ອງວິໄຈຟີຊິກສາດ", BUILDING_SLB_PHYSICS),
  ...roomRange("PH", 301, 302, "ຫ້ອງຮຽນ", BUILDING_SLB_PHYSICS),
  room("PH303", "ຫ້ອງພັກຄູ", BUILDING_SLB_PHYSICS),
  room("PH304", "ຫ້ອງທົດລອງແສງ", BUILDING_SLB_PHYSICS),
  room("PH305", "ຫ້ອງຮຽນ", BUILDING_SLB_PHYSICS),

  ...roomRange("BI", 101, 103, "ຫ້ອງຮຽນ", BUILDING_SLB_BIOLOGY),
  room("BI104", "ຫ້ອງພັກຄູ", BUILDING_SLB_BIOLOGY),
  room("BI105", "ຫ້ອງຮຽນ", BUILDING_SLB_BIOLOGY),
  room("BI201", "ຫ້ອງຮຽນ", BUILDING_SLB_BIOLOGY),
  ...roomRange("BI", 202, 203, "ຫ້ອງທົດລອງ", BUILDING_SLB_BIOLOGY),
  ...roomRange("BI", 204, 205, "ຫ້ອງອາຈານ", BUILDING_SLB_BIOLOGY),
  room("BI301", "ຫ້ອງພັກຄູ", BUILDING_SLB_BIOLOGY),
  room("BI302", "ພິພິຕະພັນພືດ", BUILDING_SLB_BIOLOGY),
  ...roomRange("BI", 303, 304, "ຫ້ອງຮຽນ", BUILDING_SLB_BIOLOGY),
  room("BI305", "Fish collection room", BUILDING_SLB_BIOLOGY),
];

export const fnsLocationMasterSeed = locationRows.map((row, index) => ({
  id: index + 1,
  ...row,
}));
