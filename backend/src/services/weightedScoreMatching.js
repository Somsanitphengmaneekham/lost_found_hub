function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return null;

  const a = new Date(dateA);
  const b = new Date(dateB);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;

  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86_400_000));
}

function containsSimilarDetail(lost, found) {
  const lostText = normalizeText(
    `${lost.brand ?? ""} ${lost.unique_mark ?? ""} ${lost.description ?? ""}`,
  );
  const foundText = normalizeText(
    `${found.brand ?? ""} ${found.unique_mark ?? ""} ${found.description ?? ""}`,
  );

  if (!lostText || !foundText) return false;

  return lostText
    .split(/\s+/u)
    .some((word) => word.length >= 3 && foundText.includes(word));
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

  const lostColor = normalizeText(lost.color);
  const foundColor = normalizeText(found.color);
  if ((lostColor && lostColor === foundColor) || containsSimilarDetail(lost, found)) {
    score += 15;
    reasons.push({ label: "ສີ ຫຼື ລາຍລະອຽດໃກ້ຄຽງກັນ", points: 15 });
  }

  return {
    score,
    matched: score >= 70,
    reasons,
  };
}

async function saveSuggestedMatch(pool, match) {
  const [existingRows] = await pool.execute(
    `SELECT id, status
     FROM matches
     WHERE lost_post_id = ?
       AND found_post_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [match.lostPostId, match.foundPostId],
  );

  const existing = existingRows[0];

  if (existing) {
    if (existing.status === "suggested") {
      await pool.execute(
        `UPDATE matches
         SET match_score = ?
         WHERE id = ?`,
        [match.score, existing.id],
      );
    }

    return {
      ...match,
      matchId: existing.id,
      status: existing.status,
      saved: true,
    };
  }

  const [result] = await pool.execute(
    `INSERT INTO matches (lost_post_id, found_post_id, match_score, status)
     VALUES (?, ?, ?, 'suggested')`,
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
  const threshold = Number(options.threshold ?? 70);
  const dateWindowDays = Number(options.dateWindowDays ?? 7);
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

  // Candidate query first: do not compare every found_posts row.
  const [candidates] = await pool.execute(
    `SELECT
       fp.*,
       c.name_th AS category_name,
       l.name_th AS found_location_name
     FROM found_posts fp
     LEFT JOIN item_categories c ON c.id = fp.category_id
     LEFT JOIN locations l ON l.id = fp.found_location_id
     WHERE fp.status IN ('approved', 'matched')
       AND fp.category_id = ?
       AND (
         ? IS NULL
         OR fp.found_at BETWEEN DATE_SUB(?, INTERVAL ? DAY)
                            AND DATE_ADD(?, INTERVAL ? DAY)
       )
       AND (
         ? IS NULL
         OR fp.found_location_id = ?
         OR ? IS NULL
         OR fp.color = ?
       )
     ORDER BY fp.found_at DESC
     LIMIT ${limit}`,
    [
      lost.category_id,
      lost.lost_at,
      lost.lost_at,
      dateWindowDays,
      lost.lost_at,
      dateWindowDays,
      lost.lost_location_id,
      lost.lost_location_id,
      lost.color,
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

  const savedMatches = [];

  for (const match of matches) {
    savedMatches.push(await saveSuggestedMatch(pool, match));
  }

  return savedMatches;
}
