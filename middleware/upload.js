import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
// const uploadDir = path.join(process.cwd(), "uploads");
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
//   },
// });
// const upload = multer({ storage });

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});


export default upload;
