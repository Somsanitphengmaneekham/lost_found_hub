const TEACHER_APPROVAL_STATUSES = new Set(["awaiting_handover", "pending_approval"]);

function notificationDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function sortNotifications(left, right) {
  if (left.priority !== right.priority) return left.priority - right.priority;

  const leftDate = new Date(left.createdAt || 0).getTime() || 0;
  const rightDate = new Date(right.createdAt || 0).getTime() || 0;
  return rightDate - leftDate;
}

function userOwnsFound(item, currentUser) {
  return Number(item.finderId) === Number(currentUser.id) || item.finder === currentUser.fullName;
}

function userOwnsLost(item, currentUser) {
  return Number(item.ownerId) === Number(currentUser.id) || item.owner === currentUser.fullName;
}

function userOwnsMatch(match, currentUser) {
  const lostOwnerId = match.lost?.ownerId;
  return Number(lostOwnerId) === Number(currentUser.id);
}

function buildTeacherNotifications({ foundItems, lostReports, claimRequests = [] }) {
  const approvalNotifications = foundItems
    .filter((item) => TEACHER_APPROVAL_STATUSES.has(item.status))
    .map((item) => {
      const isReadyForApproval = item.status === "pending_approval";

      return {
        id: `teacher-found-${item.id}-${item.status}`,
        audience: "teacher",
        tone: isReadyForApproval ? "amber" : "slate",
        title: isReadyForApproval ? "ມີລາຍການລໍຖ້າອະນຸມັດ" : "ລໍຖ້າຜູ້ພົບນຳຂອງມາສົ່ງ",
        description: `${item.title} · ${item.location}`,
        meta: isReadyForApproval ? "ສະເພາະອາຈານ · ກວດຂໍ້ມູນກ່ອນປະກາດ" : "ສະເພາະອາຈານ · ຕິດຕາມການສົ່ງມອບ",
        actionLabel: isReadyForApproval ? "ໄປອະນຸມັດ" : "ໄປກວດສອບ",
        href: "#approval",
        createdAt: notificationDate(item.foundAt),
        priority: isReadyForApproval ? 1 : 2,
      };
    });

  const lostApprovalNotifications = lostReports
    .filter((item) => item.status === "pending_approval")
    .map((item) => ({
      id: `teacher-lost-${item.id}-${item.status}`,
      audience: "teacher",
      tone: "blue",
      title: "ມີປະກາດຂອງສູນຫາຍລໍຖ້າອະນຸມັດ",
      description: `${item.title} · ${item.location}`,
      meta: "ສະເພາະອາຈານ · ກວດຂໍ້ມູນກ່ອນປະກາດ",
      actionLabel: "ໄປອະນຸມັດ",
      href: "#approval",
      createdAt: notificationDate(item.lostAt),
      priority: 1,
    }));

  const claimNotifications = claimRequests
    .filter((claim) => ["submitted", "under_review"].includes(claim.status))
    .map((claim) => ({
      id: `teacher-claim-${claim.id}-${claim.status}`,
      audience: "teacher",
      tone: "amber",
      title: "ມີນັກສຶກສາຂໍຮັບສິ່ງຂອງ",
      description: `${claim.foundTitle || "ສິ່ງຂອງທີ່ພົບ"} · ${claim.claimantName || "ນັກສຶກສາ"}`,
      meta: "ສະເພາະອາຈານ · ກວດຕົວຕົນທີ່ຫ້ອງຄຸ້ມຄອງກ່ອນສົ່ງຄືນ",
      actionLabel: "ໄປກວດສອບ",
      href: "#approval",
      createdAt: notificationDate(claim.createdAt),
      priority: 1,
    }));

  return [...claimNotifications, ...approvalNotifications, ...lostApprovalNotifications].sort(sortNotifications);
}

function buildStudentNotifications({ currentUser, foundItems, lostReports, matches, returnRecords, claimRequests = [] }) {
  const foundNotifications = foundItems
    .filter((item) => userOwnsFound(item, currentUser))
    .flatMap((item) => {
      if (item.status === "awaiting_handover") {
        return [
          {
            id: `student-found-handover-${item.id}`,
            audience: "student",
            tone: "amber",
            title: "ຢ່າລືມນຳຂອງໄປສົ່ງຫ້ອງຄຸ້ມຄອງ",
            description: `${item.title} · ${item.location}`,
            meta: "ສະເພາະນັກສຶກສາ · ສົ່ງຂອງກ່ອນອາຈານອະນຸມັດ",
            actionLabel: "ໄປແຈ້ງພົບ",
            href: "#found-form",
            createdAt: notificationDate(item.foundAt),
            priority: 1,
          },
        ];
      }

      if (item.status === "pending_approval") {
        return [
          {
            id: `student-found-pending-${item.id}`,
            audience: "student",
            tone: "blue",
            title: "ລາຍການຂອງທ່ານລໍຖ້າອາຈານອະນຸມັດ",
            description: `${item.title} · ${item.location}`,
            meta: "ສະເພາະນັກສຶກສາ · ລໍຖ້າການກວດສອບ",
            actionLabel: "ເບິ່ງ Dashboard",
            href: "#dashboard",
            createdAt: notificationDate(item.foundAt),
            priority: 2,
          },
        ];
      }

      if (item.status === "approved") {
        return [
          {
            id: `student-found-approved-${item.id}`,
            audience: "student",
            tone: "green",
            title: "ລາຍການຂອງທ່ານຖືກປະກາດແລ້ວ",
            description: `${item.title} · ${item.location}`,
            meta: "ສະເພາະນັກສຶກສາ · ເຜີຍແຜ່ໃນໜ້າຫຼັກ",
            actionLabel: "ເບິ່ງປະກາດ",
            href: "#home",
            createdAt: notificationDate(item.approvedAt || item.foundAt),
            priority: 4,
          },
        ];
      }

      if (item.status === "rejected") {
        return [
          {
            id: `student-found-rejected-${item.id}`,
            audience: "student",
            tone: "red",
            title: "ລາຍການຂອງທ່ານບໍ່ຜ່ານການກວດສອບ",
            description: `${item.title} · ${item.rejectReason || "ກະລຸນາກວດລາຍລະອຽດແລ້ວສົ່ງໃໝ່"}`,
            meta: "ສະເພາະນັກສຶກສາ · ຕ້ອງແກ້ໄຂ",
            actionLabel: "ໄປແຈ້ງພົບ",
            href: "#found-form",
            createdAt: notificationDate(item.foundAt),
            priority: 1,
          },
        ];
      }

      return [];
    });

  const lostNotifications = lostReports
    .filter((item) => userOwnsLost(item, currentUser))
    .map((item) => {
      const isMatched = item.status === "matched";
      const isPending = item.status === "pending_approval";
      const isRejected = item.status === "rejected";
      const isPublished = item.status === "published";

      return {
        id: `student-lost-${item.id}-${item.status}`,
        audience: "student",
        tone: isMatched || isPublished ? "green" : isRejected ? "red" : isPending ? "blue" : "slate",
        title: isMatched
          ? "ອາຈານແຈ້ງວ່າພົບຂອງຂອງທ່ານແລ້ວ"
          : isPending
            ? "ປະກາດຂອງສູນຫາຍລໍຖ້າອາຈານອະນຸມັດ"
            : isRejected
              ? "ປະກາດຂອງສູນຫາຍບໍ່ຜ່ານການກວດສອບ"
              : isPublished
                ? "ປະກາດຂອງສູນຫາຍຂອງທ່ານຖືກອະນຸມັດແລ້ວ"
                : "ປະກາດຂອງສູນຫາຍຂອງທ່ານຖືກບັນທຶກແລ້ວ",
        description: `${item.title} · ${item.location}`,
        meta: isMatched
          ? "ສະເພາະນັກສຶກສາ · ນຳບັດນັກສຶກສາໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ"
          : "ສະເພາະນັກສຶກສາ · ຕິດຕາມສະຖານະຂອງຕົນເອງ",
        actionLabel: isMatched ? "ເບິ່ງສະຖານະ" : "ເບິ່ງລາຍງານ",
        href: "#reports",
        createdAt: notificationDate(isMatched ? item.updatedAt || item.createdAt || item.lostAt : item.lostAt),
        priority: isMatched || isPending || isRejected ? 1 : 5,
      };
    });

  const myLostIds = new Set(lostReports.filter((item) => userOwnsLost(item, currentUser)).map((item) => Number(item.id)));
  const myFoundIds = new Set(foundItems.filter((item) => userOwnsFound(item, currentUser)).map((item) => Number(item.id)));

  const matchNotifications = matches
    .filter(
      (match) =>
        userOwnsMatch(match, currentUser) ||
        myLostIds.has(Number(match.lostPostId)),
    )
    .filter((match) => match.status !== "rejected")
    .map((match) => {
      const foundTitle = match.found?.title ?? "ຂອງທີ່ພົບ";
      const lostTitle = match.lost?.title ?? "ຂອງສູນຫາຍ";

      return {
        id: `student-match-${match.id}`,
        audience: "student",
        tone: "green",
        title: "ມີຄົນພົບຂອງທີ່ອາດເປັນຂອງທ່ານ",
        description: `${foundTitle} ອາດກົງກັບ ${lostTitle}`,
        meta: `ກະລຸນາກວດລາຍລະອຽດ ແລະ ໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ · ${Math.round(Number(match.matchScore) || 0)}%`,
        actionLabel: "ເບິ່ງລາຍການໃກ້ຄຽງ",
        href: "#matching",
        createdAt: notificationDate(match.createdAt),
        priority: 2,
      };
    });

  const returnNotifications = returnRecords
    .filter(
      (record) =>
        myFoundIds.has(Number(record.foundPostId)) ||
        record.receivedBy === currentUser.username ||
        record.receivedBy === currentUser.fullName,
    )
    .map((record) => {
      const isReceiver =
        record.receivedBy === currentUser.username ||
        record.receivedBy === currentUser.fullName;

      return {
        id: `student-return-${record.id}`,
        audience: "student",
        tone: "green",
        title: "ບັນທຶກການຄືນຂອງແລ້ວ",
        description: isReceiver
          ? "ອາຈານໄດ້ບັນທຶກວ່າທ່ານຮັບສິ່ງຂອງຄືນແລ້ວ"
          : "ລາຍການທີ່ທ່ານແຈ້ງພົບຖືກຄືນໃຫ້ເຈົ້າຂອງແລ້ວ",
        meta: "ສະເພາະນັກສຶກສາ · ການຄືນຂອງ",
        actionLabel: "ເບິ່ງລາຍງານ",
        href: "#reports",
        createdAt: notificationDate(record.returnedAt),
        priority: 3,
      };
    });

  const claimNotifications = claimRequests
    .filter((claim) => Number(claim.claimantId) === Number(currentUser.id))
    .filter((claim) => ["submitted", "under_review", "approved"].includes(claim.status))
    .map((claim) => ({
      id: `student-claim-${claim.id}-${claim.status}`,
      audience: "student",
      tone: "blue",
      title: "ສົ່ງຄຳຂໍຮັບສິ່ງຂອງແລ້ວ",
      description: `${claim.foundTitle || "ສິ່ງຂອງທີ່ພົບ"} · ກະລຸນາໄປຢືນຢັນທີ່ຫ້ອງຄຸ້ມຄອງ`,
      meta: "ສະເພາະນັກສຶກສາ · ລໍຖ້າກວດສອບຕົວຕົນ",
      actionLabel: "ເບິ່ງແຈ້ງເຕືອນ",
      href: "#notifications",
      createdAt: notificationDate(claim.createdAt),
      priority: 2,
    }));

  return [
    ...foundNotifications,
    ...lostNotifications,
    ...matchNotifications,
    ...returnNotifications,
    ...claimNotifications,
  ].sort(sortNotifications);
}

export function buildNotifications({ currentUser, foundItems, lostReports, matches, returnRecords, claimRequests }) {
  if (!currentUser) return [];

  if (currentUser.role === "teacher") {
    return buildTeacherNotifications({ foundItems, lostReports, claimRequests });
  }

  return buildStudentNotifications({ currentUser, foundItems, lostReports, matches, returnRecords, claimRequests });
}
