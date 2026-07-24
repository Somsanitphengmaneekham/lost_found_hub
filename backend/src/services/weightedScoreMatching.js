const MATCH_THRESHOLD = 70;
const DEFAULT_DATE_WINDOW_DAYS = 7;
const ACTIVE_LOST_STATUSES = new Set(["pending_approval", "published", "matched"]);
const GENERIC_ITEM_WORDS = new Set([
  "usb",
  "type",
  "typec",
  "type-c",
  "black",
  "white",
  "silver",
  "gold",
  "lost",
  "found",
  "item",
  "ສີ",
  "ດຳ",
  "ດໍາ",
  "ຂາວ",
  "ເງິນ",
  "ຄຳ",
  "ຄໍາ",
  "ພົບ",
  "ເກັບ",
  "ສູນຫາຍ",
  "ຫາຍ",
  "ສີດຳ",
  "ສີດໍາ",
  "ສີຂາວ",
]);

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return null;

  const a = new Date(dateA);
  const b = new Date(dateB);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;

  return Math.abs((a.getTime() - b.getTime()) / 86_400_000);
}

function significantWords(value) {
  return normalizeText(value)
    .split(/[^\p{L}\p{N}+#.-]+/u)
    .map((word) => word.replace(/^[-_.]+|[-_.]+$/g, ""))
    .filter((word) => word.length >= 2 && !GENERIC_ITEM_WORDS.has(word));
}

function hasSharedSignificantWord(left, right) {
  const leftWords = significantWords(left);
  const rightWords = significantWords(right);
  if (!leftWords.length || !rightWords.length) return false;

  const rightSet = new Set(rightWords);
  return leftWords.some((leftWord) => {
    if (rightSet.has(leftWord)) return true;

    return rightWords.some((rightWord) => {
      if (leftWord.length < 4 || rightWord.length < 4) return false;
      return leftWord.includes(rightWord) || rightWord.includes(leftWord);
    });
  });
}

function hasItemIdentityOverlap(lost, found) {
  const lostText = `${lost.title ?? ""} ${lost.brand ?? ""} ${lost.unique_mark ?? ""} ${lost.description ?? ""}`;
  const foundText = `${found.title ?? ""} ${found.brand ?? ""} ${found.unique_mark ?? ""} ${found.description ?? ""}`;
  return hasSharedSignificantWord(lostText, foundText);
}

function containsSimilarDetail(lost, found) {
  const lostBrand = normalizeText(lost.brand);
  const foundBrand = normalizeText(found.brand);
  if (lostBrand && foundBrand && hasSharedSignificantWord(lostBrand, foundBrand)) return true;

  if (hasSharedSignificantWord(lost.title, found.title)) return true;
  if (hasSharedSignificantWord(lost.unique_mark, found.unique_mark)) return true;
  if (hasSharedSignificantWord(lost.description, found.description)) return true;

  const lostColor = normalizeText(lost.color);
  const foundColor = normalizeText(found.color);
  const colorMatched = lostColor && foundColor && lostColor === foundColor;
  if (colorMatched && hasItemIdentityOverlap(lost, found)) return true;

  return hasSharedSignificantWord(
    `${lost.brand ?? ""} ${lost.unique_mark ?? ""} ${lost.description ?? ""}`,
    `${found.brand ?? ""} ${found.unique_mark ?? ""} ${found.description ?? ""}`,
  );
}

export function calculateMatchScore(lost, found) {
  let score = 0;
  const reasons = [];

  if (Number(lost.category_id) === Number(found.category_id)) {
    score += 40;
    reasons.push({ label: "ປະເພດສິ່ງຂອງກົງກັນ", points: 40 });
  }

  if (
    lost.lost_location_id &&
    found.found_location_id &&
    Number(lost.lost_location_id) === Number(found.found_location_id)
  ) {
    score += 25;
    reasons.push({ label: "ສະຖານທີ່ກົງກັນ", points: 25 });
  }

  const diff = daysBetween(lost.lost_at, found.found_at);
  if (diff !== null && diff <= 3) {
    score += 20;
    reasons.push({ label: "ວັນທີ່ໃກ້ກັນບໍ່ເກີນ 3 ວັນ", points: 20 });
  }

  if (containsSimilarDetail(lost, found)) {
    score += 15;
    reasons.push({ label: "ສີ ຫຼື ລາຍລະອຽດໃກ້ຄຽງກັນ", points: 15 });
  }

  return {
    score,
    matched: score >= 70,
    reasons,
  };
}

async function saveRecommendation(pool, match) {
  const [existingRows] = await pool.execute(
    `SELECT id
     FROM matches
     WHERE lost_post_id = ?
       AND found_post_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [match.lostPostId, match.foundPostId],
  );

  const existing = existingRows[0];

  if (existing) {
    await pool.execute(
      `UPDATE matches
       SET match_score = ?
       WHERE id = ?`,
      [match.score, existing.id],
    );

    return {
      ...match,
      matchId: existing.id,
      status: "suggested",
      saved: true,
    };
  }

  const [result] = await pool.execute(
    `INSERT INTO matches (lost_post_id, found_post_id, match_score)
     VALUES (?, ?, ?)`,
    [match.lostPostId, match.foundPostId, match.score],
  );

  return {
    ...match,
    matchId: result.insertId,
    status: "suggested",
    saved: true,
  };
}

export async function findCandidateMatches(pool, lostPostId, options = {}) {
  const threshold = Number(options.threshold ?? MATCH_THRESHOLD);
  const dateWindowDays = Number(options.dateWindowDays ?? DEFAULT_DATE_WINDOW_DAYS);
  const limit = Math.min(Math.max(Number(options.limit ?? 50), 1), 100);

  const [lostRows] = await pool.execute(
    `SELECT *
     FROM lost_posts
     WHERE id = ?
       AND status <> 'deleted'
     LIMIT 1`,
    [lostPostId],
  );

  const lost = lostRows[0];
  if (!lost) return [];

  if (!ACTIVE_LOST_STATUSES.has(lost.status)) {
    await pool.execute(`DELETE FROM matches WHERE lost_post_id = ?`, [lost.id]);
    return [];
  }

  // Candidate query first: use category + nearby date to avoid comparing every row.
  // Do not pre-filter by location/color because brand or detail can still push a valid pair over 70%.
  const [candidates] = await pool.execute(
    `SELECT
       fp.*,
       c.name_th AS category_name,
       l.name_th AS found_location_name
     FROM found_posts fp
     LEFT JOIN item_categories c ON c.id = fp.category_id
     LEFT JOIN locations l ON l.id = fp.found_location_id
     WHERE fp.status IN ('approved', 'matched')
       AND fp.deleted_at IS NULL
       AND fp.category_id = ?
       AND (
         ? IS NULL
         OR fp.found_at IS NULL
         OR fp.found_at BETWEEN DATE_SUB(?, INTERVAL ? DAY)
                            AND DATE_ADD(?, INTERVAL ? DAY)
       )
     ORDER BY
       (fp.found_location_id = ?) DESC,
       (LOWER(TRIM(COALESCE(fp.color, ''))) = LOWER(TRIM(COALESCE(?, '')))) DESC,
       fp.found_at DESC
     LIMIT ${limit}`,
    [
      lost.category_id,
      lost.lost_at,
      lost.lost_at,
      dateWindowDays,
      lost.lost_at,
      dateWindowDays,
      lost.lost_location_id,
      lost.color,
    ],
  );

  const matches = candidates
    .map((found) => {
      const result = calculateMatchScore(lost, found);

      return {
        lostPostId: lost.id,
        foundPostId: found.id,
        title: found.title,
        categoryName: found.category_name,
        foundLocationName: found.found_location_name,
        foundAt: found.found_at,
        score: result.score,
        matched: result.score >= threshold,
        message: result.score >= threshold ? "ພົບລາຍການທີ່ອາດກົງກັນ" : "ຄະແນນຍັງບໍ່ເຖິງເກນ",
        reasons: result.reasons,
      };
    })
    .filter((match) => match.matched)
    .sort((a, b) => b.score - a.score);

  // Recommendations are derived data. Rebuild them so edited posts never show stale scores.
  await pool.execute(`DELETE FROM matches WHERE lost_post_id = ?`, [lost.id]);

  const savedMatches = [];

  for (const match of matches) {
    savedMatches.push(await saveRecommendation(pool, match));
  }

  return savedMatches;
}

export async function cleanupStaleMatches(pool) {
  await pool.query(`
    DELETE old_match
    FROM matches old_match
    INNER JOIN matches newer_match
      ON newer_match.lost_post_id = old_match.lost_post_id
     AND newer_match.found_post_id = old_match.found_post_id
     AND newer_match.id > old_match.id
  `);

  await pool.query(`
    DELETE m
    FROM matches m
    LEFT JOIN lost_posts lp ON lp.id = m.lost_post_id
    LEFT JOIN found_posts fp ON fp.id = m.found_post_id
    WHERE lp.id IS NULL
       OR fp.id IS NULL
       OR lp.deleted_at IS NOT NULL
       OR fp.deleted_at IS NOT NULL
       OR lp.status NOT IN ('pending_approval', 'published', 'matched')
       OR fp.status NOT IN ('approved', 'matched')
  `);
}

export async function rebuildAllMatches(pool, options = {}) {
  await cleanupStaleMatches(pool);

  const [lostRows] = await pool.query(`
    SELECT id
    FROM lost_posts
    WHERE deleted_at IS NULL
      AND status IN ('pending_approval', 'published', 'matched')
    ORDER BY updated_at DESC, id DESC
  `);

  const rebuilt = [];
  for (const lost of lostRows) {
    rebuilt.push(...(await findCandidateMatches(pool, lost.id, options)));
  }

  return rebuilt;
}
