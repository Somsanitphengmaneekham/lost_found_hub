export function Footer({ currentUser, onGuideClick }) {
  return (
    <footer className="site-footer">
      <div>
        <span>
          <strong>Lost and Found</strong>
          <br />
          © 2026 ເວັບໄຊປະກາດສີ່ງຂອງສູນຫາຍ ແລະ ພົບເຫັນ ພາຍໃນຄະນະວິທະຍາສາດທໍາມະຊາດ
        </span>
      </div>
      <nav aria-label="ເມນູທ້າຍເວັບ">
        <a href={currentUser ? "#dashboard" : "#home"} onClick={onGuideClick}>
          ວິທີໃຊ້ງານ
        </a>
        <a href="#approval">ຫ້ອງຄຸ້ມຄອງ</a>
        <a href="https://fns.nuol.edu.la" target="_blank" rel="noreferrer">
          fns.nuol.edu.la
        </a>
        <a href="mailto:fns@nuol.edu.la">
          ຕິດຕໍ່ຊ່ວຍເຫຼືອ
        </a>
      </nav>
    </footer>
  );
}
