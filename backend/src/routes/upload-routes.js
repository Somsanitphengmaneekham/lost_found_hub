import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";

const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const IMAGE_ROOT = path.join(UPLOAD_ROOT, "images");
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function uploadSubfolder() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function publicUploadUrl(filePath) {
  const relativePath = path.relative(UPLOAD_ROOT, filePath).split(path.sep).join("/");
  return `/api/uploads/${relativePath}`;
}

function removeUploadedFiles(files = []) {
  for (const file of files) {
    if (!file?.path) continue;
    fs.promises.unlink(file.path).catch(() => {});
  }
}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    const destination = path.join(IMAGE_ROOT, uploadSubfolder());
    fs.mkdirSync(destination, { recursive: true });
    callback(null, destination);
  },
  filename(_req, file, callback) {
    const extension = ALLOWED_IMAGE_TYPES.get(file.mimetype) ?? path.extname(file.originalname);
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: MAX_IMAGE_COUNT,
  },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(createHttpError("ກະລຸນາອັບໂຫຼດຮູບ JPG, PNG ຫຼື WEBP ເທົ່ານັ້ນ"));
      return;
    }

    callback(null, true);
  },
});

function mapUploadError(error, files) {
  removeUploadedFiles(files);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return createHttpError("ຂະໜາດຮູບຕ້ອງບໍ່ເກີນ 8 MB", 413);
    }

    if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
      return createHttpError("ອັບໂຫຼດຮູບໄດ້ສູງສຸດ 3 ຮູບ", 400);
    }
  }

  return error;
}

export function registerUploadRoutes(app) {
  fs.mkdirSync(IMAGE_ROOT, { recursive: true });

  app.post("/api/uploads/images", (req, res, next) => {
    upload.array("images", MAX_IMAGE_COUNT)(req, res, (error) => {
      if (error) {
        next(mapUploadError(error, req.files));
        return;
      }

      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) {
        next(createHttpError("ກະລຸນາເລືອກຮູບຢ່າງໜ້ອຍ 1 ຮູບ"));
        return;
      }

      res.status(201).json({
        files: files.map((file) => ({
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: publicUploadUrl(file.path),
        })),
      });
    });
  });

  app.use(
    "/api/uploads",
    express.static(UPLOAD_ROOT, {
      fallthrough: false,
      maxAge: "7d",
      setHeaders(res) {
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    }),
  );
}
