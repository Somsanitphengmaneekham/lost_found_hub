import {
  categoryMasterSeed,
  foundSeed,
  lostSeed,
  matchSeed,
} from "../data.js";
import {
  fnsAuthMembers,
  fnsDepartmentMasterSeed,
  fnsLocationMasterSeed,
} from "../campusMasterData.js";
import { isAllowedImageUrl } from "../utils/images.js";

const STORAGE_KEY = "campusfound-local-store-v5";
const MATCH_THRESHOLD = 70;
const MAX_LOCAL_IMAGE_LENGTH = 380_000;
const MAX_LOCAL_MEMBER_IMAGE_LENGTH = 260_000;
const MAX_LOCAL_POSTS_WITH_IMAGES = 12;
const OWNER_EDITABLE_FOUND_STATUSES = new Set(["awaiting_handover", "pending_approval", "rejected"]);
const OWNER_EDITABLE_LOST_STATUSES = new Set(["pending_approval", "rejected"]);

let memoryState = createInitialState();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createInitialState() {
  const seed = {
    members: clone(fnsAuthMembers),
    categories: clone(categoryMasterSeed),
    locations: clone(fnsLocationMasterSeed),
    departments: clone(fnsDepartmentMasterSeed),
    foundPosts: clone(foundSeed),
    lostPosts: clone(lostSeed),
    matches: clone(matchSeed),
    returnRecords: [],
  };

  return {
    ...seed,
    nextIds: {
      members: nextId(seed.members),
      categories: nextId(seed.categories),
      locations: nextId(seed.locations),
      departments: nextId(seed.departments),
      foundPosts: nextId(seed.foundPosts),
      lostPosts: nextId(seed.lostPosts),
      matches: nextId(seed.matches),
      returnRecords: 1,
    },
  };
}

function nextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function readState() {
  if (typeof window === "undefined") return memoryState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      writeState(memoryState);
      return memoryState;
    }

    memoryState = { ...createInitialState(), ...JSON.parse(raw) };
    return memoryState;
  } catch {
    return memoryState;
  }
}

function isQuotaError(error) {
  return (
    error?.name === "QuotaExceededError" ||
    error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 ||
    String(error?.message ?? "").toLowerCase().includes("quota")
  );
}

function stripLargeDataUrl(value, maxLength) {
  const text = String(value ?? "");
  if (!text) return "";
  if (!isAllowedImageUrl(text)) return "";
  if (!text.startsWith("data:image/")) return text;
  return text.length <= maxLength ? text : "";
}

function compactImages(images = []) {
  return (Array.isArray(images) ? images : [])
    .slice(0, 3)
    .map((image) => ({
      ...image,
      src: stripLargeDataUrl(image.src, MAX_LOCAL_IMAGE_LENGTH),
    }))
    .filter((image) => image.src);
}

function compactPostImages(posts = []) {
  const safePosts = Array.isArray(posts) ? posts : [];
  const keepFromIndex = Math.max(0, safePosts.length - MAX_LOCAL_POSTS_WITH_IMAGES);

  return safePosts.map((post, index) => ({
    ...post,
    images: index >= keepFromIndex ? compactImages(post.images) : [],
  }));
}

function compactMemberImages(members = []) {
  return (Array.isArray(members) ? members : []).map((member) => ({
    ...member,
    cardImageUrl: stripLargeDataUrl(member.cardImageUrl, MAX_LOCAL_MEMBER_IMAGE_LENGTH),
    avatarUrl: stripLargeDataUrl(member.avatarUrl, MAX_LOCAL_MEMBER_IMAGE_LENGTH),
  }));
}

function compactStateForStorage(state) {
  const nextState = clone(state);
  nextState.members = compactMemberImages(nextState.members);
  nextState.foundPosts = compactPostImages(nextState.foundPosts);
  nextState.lostPosts = compactPostImages(nextState.lostPosts);
  return nextState;
}

function stripAllImagesFromPosts(posts = []) {
  return (Array.isArray(posts) ? posts : []).map((post) => ({
    ...post,
    images: [],
  }));
}

function stripAllMemberImages(members = []) {
  return (Array.isArray(members) ? members : []).map((member) => ({
    ...member,
    cardImageUrl: "",
    avatarUrl: "",
  }));
}

function writeState(state) {
  memoryState = state;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      if (!isQuotaError(error)) throw error;

      const compacted = compactStateForStorage(state);
      memoryState = compacted;

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
      } catch (retryError) {
        if (!isQuotaError(retryError)) throw retryError;

        const textOnly = {
          ...compacted,
          members: stripAllMemberImages(compacted.members),
          foundPosts: stripAllImagesFromPosts(compacted.foundPosts),
          lostPosts: stripAllImagesFromPosts(compacted.lostPosts),
        };
        memoryState = textOnly;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(textOnly));
      }
    }
  }
}

function localError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalize(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return normalize(value).toLocaleLowerCase("th-TH");
}

function imagesFromUrls(urls) {
  return (Array.isArray(urls) ? urls : [])
    .slice(0, 3)
    .map((url, index) => {
      const src = stripLargeDataUrl(url, MAX_LOCAL_IMAGE_LENGTH);
      if (!src) return null;

      return {
        id: `local-image-${Date.now()}-${index}`,
        name: `image-${index + 1}`,
        src,
      };
    })
    .filter(Boolean);
}

function publicMember(member) {
  const { password, ...safeMember } = member;
  return {
    ...safeMember,
    isActive: member.isActive ?? true,
    identityStatus: member.identityStatus ?? "verified",
    fullName: `${member.firstName} ${member.lastName}`,
    avatarUrl: member.avatarUrl ?? "",
  };
}

function categoryId(state, name) {
  return state.categories.find((item) => item.name === name)?.id ?? null;
}

function locationId(state, name) {
  return state.locations.find((item) => item.name === name)?.id ?? null;
}

function ensureLocation(state, name) {
  const locationName = normalize(name);
  if (!locationName) return null;

  const existing = state.locations.find((item) => lower(item.name) === lower(locationName));
  if (existing) return existing.id;

  const row = {
    id: state.nextIds.locations++,
    name: locationName,
    building: "",
    floor: "",
    locationType: "both",
    detail: "",
    isActive: true,
  };

  state.locations.push(row);
  return row.id;
}

function memberById(state, id) {
  return state.members.find((member) => Number(member.id) === Number(id));
}

function activeActorById(state, actorId) {
  const actor = memberById(state, actorId);
  if (!actor || actor.isActive === false) throw localError("active member account is required", 403);
  return actor;
}

function assertLocalFoundEditAllowed(item, actor) {
  if (!OWNER_EDITABLE_FOUND_STATUSES.has(item.status)) {
    throw localError("approved found posts cannot be edited", 409);
  }

  if (actor.role !== "teacher" && Number(item.finderId) !== Number(actor.id)) {
    throw localError("you can only edit your own found posts", 403);
  }
}

function assertLocalLostEditAllowed(item, actor) {
  if (!OWNER_EDITABLE_LOST_STATUSES.has(item.status)) {
    throw localError("approved lost posts cannot be edited", 409);
  }

  if (actor.role !== "teacher" && Number(item.ownerId) !== Number(actor.id)) {
    throw localError("you can only edit your own lost posts", 403);
  }
}

function assertLocalFoundDeleteAllowed(item, actor) {
  if (actor.role === "teacher") return;
  if (Number(item.finderId) !== Number(actor.id)) throw localError("you can only delete your own found posts", 403);
  if (!OWNER_EDITABLE_FOUND_STATUSES.has(item.status)) {
    throw localError("approved found posts cannot be deleted by the reporter", 409);
  }
}

function assertLocalLostDeleteAllowed(item, actor) {
  if (actor.role === "teacher") return;
  if (Number(item.ownerId) !== Number(actor.id)) throw localError("you can only delete your own lost posts", 403);
  if (!OWNER_EDITABLE_LOST_STATUSES.has(item.status)) {
    throw localError("approved lost posts cannot be deleted by the reporter", 409);
  }
}

function categoryRows(state) {
  return state.categories.map((item) => ({
    id: item.id,
    name: item.name,
    nameTh: item.name,
    description: item.description ?? "",
    isActive: Boolean(item.isActive),
  }));
}

function locationRows(state) {
  return state.locations.map((item) => ({
    id: item.id,
    name: item.name,
    nameTh: item.name,
    building: item.building ?? "",
    floor: item.floor ?? "",
    locationType: item.locationType ?? "both",
    detail: item.detail ?? "",
    isActive: Boolean(item.isActive),
  }));
}

function departmentRows(state) {
  return state.departments.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    nameTh: item.name,
    nameEn: item.nameEn ?? "",
    isActive: Boolean(item.isActive),
  }));
}

function foundRows(state) {
  return state.foundPosts
    .filter((item) => !item.deletedAt)
    .map((item) => {
      const finder = memberById(state, item.finderId) ?? state.members[1] ?? state.members[0];
      return {
        id: item.id,
        finderId: item.finderId,
        categoryId: categoryId(state, item.category),
        foundLocationId: locationId(state, item.location),
        categoryName: item.category,
        locationName: item.location,
        title: item.title,
        description: item.description,
        color: item.color ?? "",
        brand: item.brand ?? "",
        uniqueMark: item.uniqueMark ?? "",
        foundAt: item.foundAt,
        status: item.status,
        approvedBy: item.approvedBy ?? "",
        approvedAt: item.approvedAt ?? "",
        finderName: item.finder || finder?.fullName || "",
        imageUrl: item.images?.[0]?.src ?? "",
        imageUrls: item.images?.map((image) => image.src).filter(Boolean) ?? [],
        finderEmail: finder?.email ?? "ຫ້ອງຄຸ້ມຄອງ",
      };
    })
    .sort((a, b) => Number(new Date(b.foundAt || 0)) - Number(new Date(a.foundAt || 0)));
}

function lostRows(state) {
  return state.lostPosts
    .filter((item) => !item.deletedAt)
    .map((item) => {
      const owner = memberById(state, item.ownerId) ?? state.members[1] ?? state.members[0];
      return {
        id: item.id,
        ownerId: item.ownerId,
        categoryId: categoryId(state, item.category),
        lostLocationId: locationId(state, item.location),
        categoryName: item.category,
        locationName: item.location,
        title: item.title,
        description: item.description,
        color: item.color ?? "",
        brand: item.brand ?? "",
        uniqueMark: item.uniqueMark ?? "",
        lostAt: item.lostAt,
        contactName: item.owner,
        contactChannel: item.contact,
        status: item.status,
        ownerName: item.owner || owner?.fullName || "",
        imageUrl: item.images?.[0]?.src ?? "",
        imageUrls: item.images?.map((image) => image.src).filter(Boolean) ?? [],
      };
    })
    .sort((a, b) => Number(new Date(b.lostAt || 0)) - Number(new Date(a.lostAt || 0)));
}

function matchRows(state) {
  return state.matches
    .map((match) => {
      const lost = state.lostPosts.find((item) => item.id === match.lostPostId);
      const found = state.foundPosts.find((item) => item.id === match.foundPostId);
      if (!lost || !found || lost.deletedAt || found.deletedAt) return null;

      return {
        id: match.id,
        lostPostId: match.lostPostId,
        foundPostId: match.foundPostId,
        matchScore: Number(match.matchScore),
        status: match.status,
        createdAt: match.createdAt,
        reasons: match.reasons ?? [],
        lost: {
          id: lost.id,
          ownerId: lost.ownerId,
          title: lost.title,
          location: lost.location,
          category: lost.category,
          status: lost.status,
        },
        found: {
          id: found.id,
          title: found.title,
          location: found.location,
          category: found.category,
          status: found.status,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore);
}

function returnRows(state) {
  return state.returnRecords.map((item) => ({
    id: item.id,
    claimRequestId: item.claimRequestId,
    foundPostId: item.foundPostId,
    returnedBy: item.returnedBy,
    receivedBy: item.receivedBy,
    returnLocation: item.returnLocation,
    returnedAt: item.returnedAt,
  }));
}

function bootstrapPayload(state) {
  return {
    categories: categoryRows(state),
    locations: locationRows(state),
    departments: departmentRows(state),
    foundPosts: foundRows(state),
    lostPosts: lostRows(state),
    matches: matchRows(state),
    returnRecords: returnRows(state),
    demoUsers: state.members.map(publicMember),
    members: state.members.map(publicMember),
    localMode: true,
  };
}

function sameDayDiff(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return Number.POSITIVE_INFINITY;
  return Math.abs(leftDate.getTime() - rightDate.getTime()) / 86_400_000;
}

function textLooksRelated(left, right) {
  const leftText = lower(left);
  const rightText = lower(right);
  if (!leftText || !rightText) return false;
  return leftText.includes(rightText) || rightText.includes(leftText);
}

function calculateMatchScore(lost, found) {
  let score = 0;
  const reasons = [];

  if (lost.category && lost.category === found.category) {
    score += 40;
    reasons.push({ label: "ປະເພດສິ່ງຂອງກົງກັນ", points: 40 });
  }

  if (lost.location && lost.location === found.location) {
    score += 25;
    reasons.push({ label: "ສະຖານທີ່ກົງກັນ", points: 25 });
  }

  if (sameDayDiff(lost.lostAt, found.foundAt) <= 3) {
    score += 15;
    reasons.push({ label: "ວັນທີ່ໃກ້ກັນບໍ່ເກີນ 3 ວັນ", points: 15 });
  }

  const detailMatched =
    (lost.color && found.color && lower(lost.color) === lower(found.color)) ||
    (lost.brand && found.brand && lower(lost.brand) === lower(found.brand)) ||
    textLooksRelated(lost.uniqueMark, found.uniqueMark) ||
    textLooksRelated(lost.description, found.description);

  if (detailMatched) {
    score += 20;
    reasons.push({ label: "ສີ ຫຼື ລາຍລະອຽດໃກ້ຄຽງກັນ", points: 20 });
  }

  return { score, reasons };
}

function upsertMatch(state, lost, found) {
  const result = calculateMatchScore(lost, found);
  const existing = state.matches.find((match) => match.lostPostId === lost.id && match.foundPostId === found.id);

  if (result.score < MATCH_THRESHOLD) {
    if (existing?.status === "suggested") {
      state.matches = state.matches.filter((match) => match.id !== existing.id);
    }
    return false;
  }

  if (existing) {
    existing.matchScore = result.score;
    existing.reasons = result.reasons;
    return existing.status !== "rejected";
  }

  state.matches.push({
    id: state.nextIds.matches++,
    lostPostId: lost.id,
    foundPostId: found.id,
    matchScore: result.score,
    status: "suggested",
    createdAt: new Date().toISOString(),
    reasons: result.reasons,
  });
  return true;
}

function generateMatchesForLost(state, lost) {
  let count = 0;
  state.matches = state.matches.filter(
    (match) => match.lostPostId !== lost.id || match.status !== "suggested",
  );
  state.foundPosts
    .filter((found) => !found.deletedAt && found.status === "approved" && found.category === lost.category)
    .forEach((found) => {
      if (upsertMatch(state, lost, found)) count += 1;
    });
  return count;
}

function generateMatchesForFound(state, found) {
  let count = 0;
  state.lostPosts
    .filter((lost) => !lost.deletedAt && lost.status === "published" && lost.category === found.category)
    .forEach((lost) => {
      if (upsertMatch(state, lost, found)) count += 1;
    });
  return count;
}

function findById(items, id, label) {
  const item = items.find((row) => Number(row.id) === Number(id));
  if (!item) throw localError(`ບໍ່ພົບ${label}`, 404);
  return item;
}

export function localFetchBootstrap() {
  return bootstrapPayload(readState());
}

export function localLogin(username, password) {
  const state = readState();
  const member = state.members.find(
    (item) => lower(item.username) === lower(username) && String(item.password) === String(password),
  );
  if (!member) throw localError("ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ", 401);
  if (member.isActive === false) throw localError("ບັນຊີນີ້ຖືກປິດໃຊ້ງານ", 403);
  return publicMember(member);
}

export function localDemoLogin(id) {
  const member = memberById(readState(), id);
  if (!member) throw localError("ບໍ່ພົບຜູ້ໃຊ້", 404);
  return publicMember(member);
}

export function localRegister(body) {
  const state = readState();
  const username = normalize(body.username);
  const email = normalize(body.email);
  const requiredFields = [
    ["ຊື່ຜູ້ໃຊ້", username],
    ["ລະຫັດຜ່ານ", body.password],
    ["ຊື່", body.firstName],
    ["ນາມສະກຸນ", body.lastName],
    ["ອີເມວ", email],
    ["ເບີໂທ", body.phone],
    ["ພາກວິຊາ", body.department],
    ["ລະຫັດນັກສຶກສາ", body.studentCode],
    ["ຮູບບັດນັກສຶກສາ", body.cardImageUrl],
  ];
  const missingFields = requiredFields.filter(([, value]) => !normalize(value)).map(([label]) => label);

  if (missingFields.length) {
    throw localError(`ກະລຸນາກອກຂໍ້ມູນໃຫ້ຄົບ: ${missingFields.join(", ")}`, 400);
  }

  if (state.members.some((item) => lower(item.username) === lower(username))) {
    throw localError("ຊື່ຜູ້ໃຊ້ນີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  if (state.members.some((item) => lower(item.email) === lower(email))) {
    throw localError("ອີເມວນີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  if (body.role && body.role !== "student") {
    throw localError("ບັນຊີອາຈານ ແລະ ຝ່າຍຄຸ້ມຄອງຕ້ອງໃຫ້ເຈົ້າໜ້າທີ່ສ້າງໃຫ້ເທົ່ານັ້ນ", 403);
  }

  const member = {
    id: state.nextIds.members++,
    role: "student",
    username,
    password: String(body.password),
    studentCode: normalize(body.studentCode),
    employeeCode: "",
    firstName: normalize(body.firstName),
    lastName: normalize(body.lastName),
    fullName: `${normalize(body.firstName)} ${normalize(body.lastName)}`,
    email,
    phone: normalize(body.phone),
    department: body.department || state.departments[0]?.name || "",
    identityStatus: "verified",
    cardImageUrl: body.cardImageUrl,
    avatarUrl: "",
    isActive: true,
  };

  state.members.push(member);
  writeState(state);
  return publicMember(member);
}

export function localFetchMembers() {
  return readState().members.map(publicMember);
}

export function localCreateTeacherMember(body) {
  const state = readState();
  const username = normalize(body.username);
  const email = normalize(body.email);
  const employeeCode = normalize(body.employeeCode);
  const requiredFields = [
    ["Username", username],
    ["Password", body.password],
    ["ຊື່", body.firstName],
    ["ນາມສະກຸນ", body.lastName],
    ["Email", email],
    ["ເບີໂທ", body.phone],
    ["ພາກວິຊາ", body.department],
    ["ລະຫັດອາຈານ", employeeCode],
  ];
  const missingFields = requiredFields.filter(([, value]) => !normalize(value)).map(([label]) => label);

  if (missingFields.length) {
    throw localError(`ກະລຸນາກອກຂໍ້ມູນໃຫ້ຄົບ: ${missingFields.join(", ")}`, 400);
  }

  if (state.members.some((item) => lower(item.username) === lower(username))) {
    throw localError("ຊື່ຜູ້ໃຊ້ນີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  if (state.members.some((item) => lower(item.email) === lower(email))) {
    throw localError("ອີເມວນີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  if (state.members.some((item) => lower(item.employeeCode) === lower(employeeCode))) {
    throw localError("ລະຫັດອາຈານນີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  const member = {
    id: state.nextIds.members++,
    role: "teacher",
    username,
    password: String(body.password),
    studentCode: "",
    employeeCode,
    firstName: normalize(body.firstName),
    lastName: normalize(body.lastName),
    fullName: `${normalize(body.firstName)} ${normalize(body.lastName)}`,
    email,
    phone: normalize(body.phone),
    department: body.department || state.departments[0]?.name || "",
    identityStatus: "verified",
    cardImageUrl: "",
    avatarUrl: "",
    isActive: true,
  };

  state.members.push(member);
  writeState(state);
  return publicMember(member);
}

export function localUpdateMember(id, body) {
  const state = readState();
  const member = findById(state.members, id, "ສະມາຊິກ");
  if (member.role === "student") {
    throw localError(
      "ອາຈານບໍ່ສາມາດແກ້ໄຂຂໍ້ມູນນັກສຶກສາ ສາມາດປິດໃຊ້ງານ ຫຼື ລຶບບັນຊີເທົ່ານັ້ນ",
      403,
    );
  }
  const username = normalize(body.username);
  const email = normalize(body.email);
  const studentCode = normalize(body.studentCode);
  const employeeCode = normalize(body.employeeCode);

  if (!username || !normalize(body.firstName) || !normalize(body.lastName) || !email || !normalize(body.phone)) {
    throw localError("ກະລຸນາກອກຂໍ້ມູນຜູ້ໃຊ້ໃຫ້ຄົບ", 400);
  }

  if (member.role === "student" && !studentCode) throw localError("ກະລຸນາລະບຸລະຫັດນັກສຶກສາ", 400);
  if (member.role === "teacher" && !employeeCode) throw localError("ກະລຸນາລະບຸລະຫັດອາຈານ", 400);

  if (state.members.some((item) => item.id !== member.id && lower(item.username) === lower(username))) {
    throw localError("ຊື່ຜູ້ໃຊ້ນີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  if (state.members.some((item) => item.id !== member.id && lower(item.email) === lower(email))) {
    throw localError("ອີເມວນີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  if (
    studentCode &&
    state.members.some((item) => item.id !== member.id && lower(item.studentCode) === lower(studentCode))
  ) {
    throw localError("ລະຫັດນັກສຶກສານີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  if (
    employeeCode &&
    state.members.some((item) => item.id !== member.id && lower(item.employeeCode) === lower(employeeCode))
  ) {
    throw localError("ລະຫັດອາຈານນີ້ຖືກໃຊ້ແລ້ວ", 409);
  }

  Object.assign(member, {
    username,
    firstName: normalize(body.firstName),
    lastName: normalize(body.lastName),
    fullName: `${normalize(body.firstName)} ${normalize(body.lastName)}`,
    email,
    phone: normalize(body.phone),
    department: body.department || member.department,
    studentCode: member.role === "student" ? studentCode : "",
    employeeCode: member.role === "teacher" ? employeeCode : "",
  });

  if (body.password) member.password = String(body.password);

  writeState(state);
  return publicMember(member);
}

export function localUpdateMemberActiveStatus(id, isActive, actorId) {
  if (Number(id) === Number(actorId) && !isActive) {
    throw localError("ບໍ່ສາມາດປິດບັນຊີທີ່ກຳລັງໃຊ້ງານຢູ່", 400);
  }

  const state = readState();
  const member = findById(state.members, id, "ສະມາຊິກ");
  member.isActive = Boolean(isActive);
  writeState(state);
  return publicMember(member);
}

export function localDeleteMember(id, actorId) {
  if (Number(id) === Number(actorId)) {
    throw localError("ບໍ່ສາມາດລຶບບັນຊີທີ່ກຳລັງໃຊ້ງານຢູ່", 400);
  }

  const state = readState();
  const member = findById(state.members, id, "ສະມາຊິກ");
  if (member.role !== "student") {
    throw localError("ໜ້ານີ້ອະນຸຍາດໃຫ້ລຶບສະເພາະບັນຊີນັກສຶກສາ", 403);
  }

  const hasRelatedData =
    state.lostPosts.some((item) => Number(item.ownerId) === Number(id)) ||
    state.foundPosts.some((item) => Number(item.finderId) === Number(id)) ||
    state.returnRecords.some(
      (item) => Number(item.returnedBy) === Number(id) || Number(item.receivedBy) === Number(id),
    );

  if (hasRelatedData) {
    throw localError(
      "ບັນຊີນີ້ມີປະຫວັດປະກາດ ຫຼື ທຸລະກຳແລ້ວ ກະລຸນາໃຊ້ປິດໃຊ້ງານແທນການລຶບ",
      409,
    );
  }

  state.members = state.members.filter((item) => Number(item.id) !== Number(id));
  writeState(state);
}

export function localUpdateProfile(id, body) {
  const state = readState();
  const member = findById(state.members, id, "ສະມາຊິກ");
  const next = {
    ...member,
    firstName: body.firstName !== undefined ? normalize(body.firstName) : member.firstName,
    lastName: body.lastName !== undefined ? normalize(body.lastName) : member.lastName,
    email: body.email !== undefined ? normalize(body.email) : member.email,
    phone: body.phone !== undefined ? normalize(body.phone) : member.phone,
    department: body.department !== undefined ? body.department : member.department,
    studentCode: body.studentCode !== undefined ? normalize(body.studentCode) : member.studentCode,
    employeeCode: body.employeeCode !== undefined ? normalize(body.employeeCode) : member.employeeCode,
    identityStatus: member.identityStatus ?? "verified",
    cardImageUrl: body.cardImageUrl !== undefined ? normalize(body.cardImageUrl) : member.cardImageUrl,
    avatarUrl: body.avatarUrl !== undefined ? normalize(body.avatarUrl) : member.avatarUrl,
  };
  next.fullName = `${next.firstName} ${next.lastName}`;
  Object.assign(member, next);
  writeState(state);
  return publicMember(member);
}

export function localCreateCategory(body) {
  const state = readState();
  const name = normalize(body.name);
  if (!name) throw localError("ກະລຸນາລະບຸຊື່ໝວດໝູ່");
  if (state.categories.some((item) => lower(item.name) === lower(name))) throw localError("ຂໍ້ມູນຊ້ຳກັບລາຍການທີ່ມີຢູ່ແລ້ວ", 409);

  const row = {
    id: state.nextIds.categories++,
    name,
    description: normalize(body.description),
    isActive: body.isActive ?? true,
  };
  state.categories.push(row);
  writeState(state);
  return categoryRows(state).find((item) => item.id === row.id);
}

export function localUpdateCategory(id, body) {
  const state = readState();
  const item = findById(state.categories, id, "ໝວດໝູ່");
  const oldName = item.name;
  item.name = normalize(body.name) || item.name;
  item.description = body.description !== undefined ? normalize(body.description) : item.description;
  item.isActive = body.isActive ?? item.isActive;

  if (oldName !== item.name) {
    state.foundPosts.forEach((post) => {
      if (post.category === oldName) post.category = item.name;
    });
    state.lostPosts.forEach((post) => {
      if (post.category === oldName) post.category = item.name;
    });
  }

  writeState(state);
  return categoryRows(state).find((row) => row.id === item.id);
}

export function localDeleteCategory(id) {
  const state = readState();
  const item = findById(state.categories, id, "ໝວດໝູ່");
  const used = state.foundPosts.some((post) => post.category === item.name && !post.deletedAt) ||
    state.lostPosts.some((post) => post.category === item.name && !post.deletedAt);
  if (used) throw localError("ບໍ່ສາມາດລຶບໄດ້ ໝວດໝູ່ນີ້ຖືກໃຊ້ງານໃນປະກາດແລ້ວ", 409);
  state.categories = state.categories.filter((row) => row.id !== item.id);
  writeState(state);
  return { id: item.id, message: "ລຶບໝວດໝູ່ແລ້ວ" };
}

export function localCreateLocation(body) {
  const state = readState();
  const name = normalize(body.name);
  if (!name) throw localError("ກະລຸນາລະບຸຊື່ສະຖານທີ່");
  const row = {
    id: state.nextIds.locations++,
    name,
    building: normalize(body.building),
    floor: normalize(body.floor),
    locationType: body.locationType ?? "both",
    detail: normalize(body.detail),
    isActive: body.isActive ?? true,
  };
  state.locations.push(row);
  writeState(state);
  return locationRows(state).find((item) => item.id === row.id);
}

export function localUpdateLocation(id, body) {
  const state = readState();
  const item = findById(state.locations, id, "ສະຖານທີ່");
  const oldName = item.name;
  item.name = normalize(body.name) || item.name;
  item.building = body.building !== undefined ? normalize(body.building) : item.building;
  item.floor = body.floor !== undefined ? normalize(body.floor) : item.floor;
  item.locationType = body.locationType ?? item.locationType;
  item.detail = body.detail !== undefined ? normalize(body.detail) : item.detail;
  item.isActive = body.isActive ?? item.isActive;

  if (oldName !== item.name) {
    state.foundPosts.forEach((post) => {
      if (post.location === oldName) post.location = item.name;
    });
    state.lostPosts.forEach((post) => {
      if (post.location === oldName) post.location = item.name;
    });
  }

  writeState(state);
  return locationRows(state).find((row) => row.id === item.id);
}

export function localDeleteLocation(id) {
  const state = readState();
  const item = findById(state.locations, id, "ສະຖານທີ່");
  const used = state.foundPosts.some((post) => post.location === item.name && !post.deletedAt) ||
    state.lostPosts.some((post) => post.location === item.name && !post.deletedAt);
  if (used) throw localError("ບໍ່ສາມາດລຶບໄດ້ ສະຖານທີ່ນີ້ຖືກໃຊ້ງານໃນປະກາດແລ້ວ", 409);
  state.locations = state.locations.filter((row) => row.id !== item.id);
  writeState(state);
  return { id: item.id, message: "ລຶບສະຖານທີ່ແລ້ວ" };
}

export function localCreateDepartment(body) {
  const state = readState();
  const code = normalize(body.code).toUpperCase();
  const name = normalize(body.name);
  if (!code || !name) throw localError("ກະລຸນາລະບຸລະຫັດ ແລະ ຊື່ພາກວິຊາ");
  const row = {
    id: state.nextIds.departments++,
    code,
    name,
    nameEn: normalize(body.nameEn),
    isActive: body.isActive ?? true,
  };
  state.departments.push(row);
  writeState(state);
  return departmentRows(state).find((item) => item.id === row.id);
}

export function localUpdateDepartment(id, body) {
  const state = readState();
  const item = findById(state.departments, id, "ພາກວິຊາ");
  const oldName = item.name;
  item.code = body.code !== undefined ? normalize(body.code).toUpperCase() : item.code;
  item.name = normalize(body.name) || item.name;
  item.nameEn = body.nameEn !== undefined ? normalize(body.nameEn) : item.nameEn;
  item.isActive = body.isActive ?? item.isActive;

  if (oldName !== item.name) {
    state.members.forEach((member) => {
      if (member.department === oldName) member.department = item.name;
    });
  }

  writeState(state);
  return departmentRows(state).find((row) => row.id === item.id);
}

export function localDeleteDepartment(id) {
  const state = readState();
  const item = findById(state.departments, id, "ພາກວິຊາ");
  if (state.members.some((member) => member.department === item.name)) {
    throw localError("ບໍ່ສາມາດລຶບໄດ້ ພາກວິຊານີ້ຖືກໃຊ້ງານໂດຍສະມາຊິກແລ້ວ", 409);
  }
  state.departments = state.departments.filter((row) => row.id !== item.id);
  writeState(state);
  return { id: item.id, message: "ລຶບພາກວິຊາແລ້ວ" };
}

export function localCreateFoundPost(body) {
  const state = readState();
  const finder = memberById(state, body.finderId);
  const locationName = normalize(body.locationName);
  ensureLocation(state, locationName);
  const row = {
    id: state.nextIds.foundPosts++,
    finderId: body.finderId,
    title: normalize(body.title) || "ຂອງທີ່ພົບໃໝ່",
    category: body.categoryName,
    location: locationName,
    description: normalize(body.description) || "ລໍຖ້າກອກລາຍລະອຽດເພີ່ມເຕີມ",
    color: normalize(body.color),
    brand: normalize(body.brand),
    uniqueMark: normalize(body.uniqueMark),
    foundAt: body.foundAt,
    finder: finder?.fullName ?? "",
    contact: "ຫ້ອງຄຸ້ມຄອງ",
    status: body.status ?? "pending_approval",
    approvedBy: "",
    approvedAt: "",
    images: imagesFromUrls(body.imageUrls),
  };
  state.foundPosts.push(row);
  if (row.status === "approved") generateMatchesForFound(state, row);
  writeState(state);
  return foundRows(state).find((item) => item.id === row.id);
}

export function localUpdateFoundPost(id, body) {
  const state = readState();
  const item = findById(state.foundPosts, id, "ປະກາດພົບຂອງ");
  const actor = activeActorById(state, body.actorId);
  assertLocalFoundEditAllowed(item, actor);
  const nextLocation = body.locationName !== undefined ? normalize(body.locationName) : item.location;
  ensureLocation(state, nextLocation);
  Object.assign(item, {
    title: normalize(body.title) || item.title,
    category: body.categoryName ?? item.category,
    location: nextLocation || item.location,
    description: normalize(body.description) || item.description,
    color: body.color !== undefined ? normalize(body.color) : item.color,
    brand: body.brand !== undefined ? normalize(body.brand) : item.brand,
    uniqueMark: body.uniqueMark !== undefined ? normalize(body.uniqueMark) : item.uniqueMark,
    foundAt: body.foundAt ?? item.foundAt,
    status: body.status ?? item.status,
    images: body.imageUrls !== undefined ? imagesFromUrls(body.imageUrls) : item.images,
  });
  if (item.status === "approved") generateMatchesForFound(state, item);
  writeState(state);
  return foundRows(state).find((row) => row.id === item.id);
}

export function localMoveFoundToApproval(id) {
  const state = readState();
  const item = findById(state.foundPosts, id, "ປະກາດພົບຂອງ");
  item.status = "pending_approval";
  writeState(state);
  return foundRows(state).find((row) => row.id === item.id);
}

export function localApproveFoundPost(id, approvedByMemberId) {
  const state = readState();
  const item = findById(state.foundPosts, id, "ປະກາດພົບຂອງ");
  const approver = memberById(state, approvedByMemberId);
  item.status = "approved";
  item.approvedBy = approver?.username ?? "teacher01";
  item.approvedAt = new Date().toISOString();
  const matchCount = generateMatchesForFound(state, item);
  writeState(state);
  return { ...foundRows(state).find((row) => row.id === item.id), matchCount };
}

export function localRejectFoundPost(id) {
  const state = readState();
  const item = findById(state.foundPosts, id, "ປະກາດພົບຂອງ");
  item.status = "rejected";
  writeState(state);
  return foundRows(state).find((row) => row.id === item.id);
}

export function localDeleteFoundPost(id, actorId) {
  const state = readState();
  const item = findById(state.foundPosts, id, "ປະກາດພົບຂອງ");
  const actor = activeActorById(state, actorId);
  assertLocalFoundDeleteAllowed(item, actor);
  item.deletedAt = new Date().toISOString();
  state.matches = state.matches.filter((match) => match.foundPostId !== item.id);
  writeState(state);
  return { id: item.id, message: "ລຶບປະກາດພົບຂອງແລ້ວ" };
}

export function localCreateLostPost(body) {
  const state = readState();
  const owner = memberById(state, body.ownerId);
  const locationName = normalize(body.locationName);
  ensureLocation(state, locationName);
  const row = {
    id: state.nextIds.lostPosts++,
    ownerId: body.ownerId,
    title: normalize(body.title) || "ຂອງສູນຫາຍໃໝ່",
    category: body.categoryName,
    location: locationName,
    description: normalize(body.description) || "ລໍຖ້າຂໍ້ມູນເພີ່ມເຕີມຈາກຜູ້ແຈ້ງ",
    color: normalize(body.color),
    brand: normalize(body.brand),
    uniqueMark: normalize(body.uniqueMark),
    lostAt: body.lostAt,
    owner: normalize(body.contactName) || owner?.fullName || "",
    contact: normalize(body.contactChannel) || owner?.email || "",
    status: body.status ?? "pending_approval",
    images: imagesFromUrls(body.imageUrls),
  };
  state.lostPosts.push(row);
  const matchCount = generateMatchesForLost(state, row);
  writeState(state);
  return { ...lostRows(state).find((item) => item.id === row.id), matchCount };
}

export function localUpdateLostPost(id, body) {
  const state = readState();
  const item = findById(state.lostPosts, id, "ປະກາດຂອງສູນຫາຍ");
  const actor = activeActorById(state, body.actorId);
  assertLocalLostEditAllowed(item, actor);
  const nextLocation = body.locationName !== undefined ? normalize(body.locationName) : item.location;
  ensureLocation(state, nextLocation);
  Object.assign(item, {
    title: normalize(body.title) || item.title,
    category: body.categoryName ?? item.category,
    location: nextLocation || item.location,
    description: normalize(body.description) || item.description,
    color: body.color !== undefined ? normalize(body.color) : item.color,
    brand: body.brand !== undefined ? normalize(body.brand) : item.brand,
    uniqueMark: body.uniqueMark !== undefined ? normalize(body.uniqueMark) : item.uniqueMark,
    lostAt: body.lostAt ?? item.lostAt,
    owner: body.contactName !== undefined ? normalize(body.contactName) : item.owner,
    contact: body.contactChannel !== undefined ? normalize(body.contactChannel) : item.contact,
    status: body.status ?? item.status,
    images: body.imageUrls !== undefined ? imagesFromUrls(body.imageUrls) : item.images,
  });
  generateMatchesForLost(state, item);
  writeState(state);
  return lostRows(state).find((row) => row.id === item.id);
}

export function localApproveLostPost(id) {
  const state = readState();
  const item = findById(state.lostPosts, id, "ປະກາດຂອງສູນຫາຍ");
  item.status = "published";
  const matchCount = generateMatchesForLost(state, item);
  writeState(state);
  return { ...lostRows(state).find((row) => row.id === item.id), matchCount };
}

export function localRejectLostPost(id) {
  const state = readState();
  const item = findById(state.lostPosts, id, "ປະກາດຂອງສູນຫາຍ");
  item.status = "rejected";
  state.matches = state.matches.filter((match) => match.lostPostId !== item.id);
  writeState(state);
  return lostRows(state).find((row) => row.id === item.id);
}

export function localDeleteLostPost(id, actorId) {
  const state = readState();
  const item = findById(state.lostPosts, id, "ປະກາດຂອງສູນຫາຍ");
  const actor = activeActorById(state, actorId);
  assertLocalLostDeleteAllowed(item, actor);
  item.deletedAt = new Date().toISOString();
  state.matches = state.matches.filter((match) => match.lostPostId !== item.id);
  writeState(state);
  return { id: item.id, message: "ລຶບປະກາດຂອງສູນຫາຍແລ້ວ" };
}

export function localUpdateMatchStatus(id, status) {
  const state = readState();
  const match = findById(state.matches, id, "match");
  if (!["suggested", "confirmed", "rejected"].includes(status)) throw localError("ສະຖານະ match ບໍ່ຖືກຕ້ອງ");
  match.status = status;

  if (status === "confirmed") {
    const found = state.foundPosts.find((item) => item.id === match.foundPostId);
    const lost = state.lostPosts.find((item) => item.id === match.lostPostId);
    if (found) found.status = "matched";
    if (lost) lost.status = "matched";
  }

  writeState(state);
  return { id: match.id, status: match.status };
}

export function localReturnMatchedItem(id, body) {
  const state = readState();
  const match = findById(state.matches, id, "match");
  const found = findById(state.foundPosts, match.foundPostId, "ປະກາດພົບຂອງ");
  const lost = findById(state.lostPosts, match.lostPostId, "ປະກາດຂອງສູນຫາຍ");
  const teacher = activeActorById(state, body.returnedByMemberId);
  const receiver = memberById(state, body.receivedByMemberId) ?? memberById(state, lost.ownerId);

  if (teacher.role !== "teacher") throw localError("returning items requires an active teacher account", 403);
  if (match.status !== "confirmed") throw localError("return can only be recorded after the match is confirmed", 409);
  if (found.status === "returned" || ["closed", "resolved", "deleted"].includes(lost.status)) {
    throw localError("this item has already been returned", 409);
  }
  if (Number(receiver?.id) !== Number(lost.ownerId)) {
    throw localError("receivedByMemberId must be the lost post owner", 400);
  }

  const record = {
    id: state.nextIds.returnRecords++,
    claimRequestId: `CR-${match.id}`,
    foundPostId: found.id,
    returnedBy: teacher?.username ?? "teacher01",
    receivedBy: receiver?.username ?? lost.owner,
    returnLocation: body.returnLocationName || "ຫ້ອງຄຸ້ມຄອງ",
    returnedAt: new Date().toISOString(),
  };
  state.returnRecords.unshift(record);
  found.status = "returned";
  lost.status = "closed";
  match.status = "confirmed";
  writeState(state);
  return record;
}

export function localReturnFoundPost(id, body) {
  const state = readState();
  const found = findById(state.foundPosts, id, "ປະກາດພົບຂອງ");
  const teacher = activeActorById(state, body.returnedByMemberId);
  const receiver = memberById(state, body.receivedByMemberId);

  if (teacher.role !== "teacher") throw localError("returning items requires an active teacher account", 403);
  if (!receiver || receiver.role !== "student" || receiver.isActive === false) {
    throw localError("ກະລຸນາເລືອກນັກສຶກສາຜູ້ຮັບຄືນທີ່ຍັງເປີດໃຊ້ງານ", 400);
  }
  if (!["approved", "matched"].includes(found.status)) {
    throw localError("ສາມາດບັນທຶກການຄືນໄດ້ສະເພາະລາຍການທີ່ອະນຸມັດແລ້ວ", 409);
  }

  const matchingRow = state.matches
    .filter((match) => Number(match.foundPostId) === Number(found.id))
    .map((match) => ({
      match,
      lost: state.lostPosts.find((lost) => Number(lost.id) === Number(match.lostPostId)),
    }))
    .filter(({ lost }) => Number(lost?.ownerId) === Number(receiver.id))
    .sort((left, right) => Number(right.match.matchScore) - Number(left.match.matchScore))[0];

  const recordId = state.nextIds.returnRecords++;
  const record = {
    id: recordId,
    claimRequestId: `CR-DIRECT-${recordId}`,
    foundPostId: found.id,
    returnedBy: teacher.username,
    receivedBy: receiver.username,
    returnLocation: "ຫ້ອງຄຸ້ມຄອງ",
    returnedAt: new Date().toISOString(),
  };

  state.returnRecords.unshift(record);
  found.status = "returned";
  if (matchingRow?.lost) matchingRow.lost.status = "closed";
  writeState(state);
  return { post: foundRows(state).find((item) => item.id === found.id), returnRecord: record };
}
