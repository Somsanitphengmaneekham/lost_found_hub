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
  const foundFinderId = match.found?.finderId;

  return Number(lostOwnerId) === Number(currentUser.id) || Number(foundFinderId) === Number(currentUser.id);
}

function buildTeacherNotifications({ foundItems, lostReports, matches, members }) {
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

  const matchNotifications = matches
    .filter((match) => match.status === "suggested" || match.status === "confirmed")
    .map((match) => {
      const isSuggested = match.status === "suggested";
      const foundTitle = match.found?.title ?? "ຂອງທີ່ພົບ";
      const lostTitle = match.lost?.title ?? "ຂອງສູນຫາຍ";

      return {
        id: `teacher-match-${match.id}-${match.status}`,
        audience: "teacher",
        tone: isSuggested ? "blue" : "green",
        title: isSuggested ? "ລະບົບພົບລາຍການທີ່ອາດກົງກັນ" : "Match ຖືກຢືນຢັນ ລໍຖ້າຄືນຂອງ",
        description: `${lostTitle} ອາດກົງກັບ ${foundTitle}`,
        meta: `ສະເພາະອາຈານ · ຄະແນນ Match ${Math.round(Number(match.matchScore) || 0)}%`,
        actionLabel: "ໄປໜ້າ Match",
        href: "#matches",
        createdAt: notificationDate(match.createdAt),
        priority: isSuggested ? 2 : 1,
      };
    });

  const identityNotifications = members
    .filter((member) => member.role === "student" && member.identityStatus === "pending")
    .map((member) => ({
      id: `teacher-identity-${member.id}`,
      audience: "teacher",
      tone: "purple",
      title: "ນັກສຶກສາລໍຖ້າຢືນຢັນຕົວຕົນ",
      description: `${member.fullName || member.username} · ${member.department || "ບໍ່ລະບຸພາກວິຊາ"}`,
      meta: "ສະເພາະອາຈານ · ກວດຮູບບັດນັກສຶກສາ",
      actionLabel: "ໄປຈັດການຜູ້ໃຊ້",
      href: "#master-data",
      createdAt: "",
      priority: 1,
    }));

  return [...approvalNotifications, ...lostApprovalNotifications, ...matchNotifications, ...identityNotifications].sort(sortNotifications);
}

function buildStudentNotifications({ currentUser, foundItems, lostReports, matches, returnRecords }) {
  const identityNotifications = [];

  if (currentUser.identityStatus === "pending") {
    identityNotifications.push({
      id: "student-identity-pending",
      audience: "student",
      tone: "amber",
      title: "ບັດນັກສຶກສາກຳລັງລໍຖ້າກວດສອບ",
      description: "ອາຈານຈະກວດຮູບບັດກ່ອນຢືນຢັນຕົວຕົນ",
      meta: "ສະເພາະນັກສຶກສາ · ສະຖານະໂປຣໄຟລ໌",
      actionLabel: "ໄປໂປຣໄຟລ໌",
      href: "#profile",
      createdAt: "",
      priority: 1,
    });
  }

  if (currentUser.identityStatus === "rejected") {
    identityNotifications.push({
      id: "student-identity-rejected",
      audience: "student",
      tone: "red",
      title: "ການຢືນຢັນຕົວຕົນຖືກປະຕິເສດ",
      description: "ກະລຸນາອັບໂຫຼດຮູບບັດນັກສຶກສາໃໝ່ໃຫ້ຊັດເຈນ",
      meta: "ສະເພາະນັກສຶກສາ · ຕ້ອງແກ້ໄຂ",
      actionLabel: "ໄປໂປຣໄຟລ໌",
      href: "#profile",
      createdAt: "",
      priority: 1,
    });
  }

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
            description: `${item.title} · ກະລຸນາກວດລາຍລະອຽດແລ້ວສົ່ງໃໝ່`,
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
          ? "ຂອງສູນຫາຍຂອງທ່ານຖືກຈັບຄູ່ແລ້ວ"
          : isPending
            ? "ປະກາດຂອງສູນຫາຍລໍຖ້າອາຈານອະນຸມັດ"
            : isRejected
              ? "ປະກາດຂອງສູນຫາຍບໍ່ຜ່ານການກວດສອບ"
              : "ປະກາດຂອງສູນຫາຍຂອງທ່ານຖືກບັນທຶກແລ້ວ",
        description: `${item.title} · ${item.location}`,
        meta: "ສະເພາະນັກສຶກສາ · ຕິດຕາມສະຖານະຂອງຕົນເອງ",
        actionLabel: "ເບິ່ງລາຍງານ",
        href: "#reports",
        createdAt: notificationDate(item.lostAt),
        priority: isMatched || isPending || isRejected ? 1 : 5,
      };
    });

  const myLostIds = new Set(lostReports.filter((item) => userOwnsLost(item, currentUser)).map((item) => Number(item.id)));
  const myFoundIds = new Set(foundItems.filter((item) => userOwnsFound(item, currentUser)).map((item) => Number(item.id)));

  const matchNotifications = matches
    .filter(
      (match) =>
        userOwnsMatch(match, currentUser) ||
        myLostIds.has(Number(match.lostPostId)) ||
        myFoundIds.has(Number(match.foundPostId)),
    )
    .filter((match) => match.status === "suggested" || match.status === "confirmed")
    .map((match) => {
      const isConfirmed = match.status === "confirmed";
      const foundTitle = match.found?.title ?? "ຂອງທີ່ພົບ";
      const lostTitle = match.lost?.title ?? "ຂອງສູນຫາຍ";

      return {
        id: `student-match-${match.id}-${match.status}`,
        audience: "student",
        tone: isConfirmed ? "green" : "blue",
        title: isConfirmed ? "ອາຈານຢືນຢັນລາຍການທີ່ກົງກັນແລ້ວ" : "ພົບລາຍການທີ່ອາດກົງກັນ",
        description: `${lostTitle} ອາດກົງກັບ ${foundTitle}`,
        meta: `ສະເພາະນັກສຶກສາ · ຄະແນນ Match ${Math.round(Number(match.matchScore) || 0)}%`,
        actionLabel: "ເບິ່ງ Dashboard",
        href: "#dashboard",
        createdAt: notificationDate(match.createdAt),
        priority: isConfirmed ? 1 : 2,
      };
    });

  const returnNotifications = returnRecords
    .filter((record) => myFoundIds.has(Number(record.foundPostId)))
    .map((record) => ({
      id: `student-return-${record.id}`,
      audience: "student",
      tone: "green",
      title: "ບັນທຶກການຄືນຂອງແລ້ວ",
      description: "ລາຍການທີ່ທ່ານແຈ້ງພົບຖືກຄືນໃຫ້ເຈົ້າຂອງແລ້ວ",
      meta: "ສະເພາະນັກສຶກສາ · ການຄືນຂອງ",
      actionLabel: "ເບິ່ງລາຍງານ",
      href: "#reports",
      createdAt: notificationDate(record.returnedAt),
      priority: 3,
    }));

  return [
    ...identityNotifications,
    ...foundNotifications,
    ...lostNotifications,
    ...matchNotifications,
    ...returnNotifications,
  ].sort(sortNotifications);
}

export function buildNotifications({ currentUser, foundItems, lostReports, matches, members, returnRecords }) {
  if (!currentUser) return [];

  if (currentUser.role === "teacher") {
    return buildTeacherNotifications({ foundItems, lostReports, matches, members });
  }

  return buildStudentNotifications({ currentUser, foundItems, lostReports, matches, returnRecords });
}
