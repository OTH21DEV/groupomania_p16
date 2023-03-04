const express = require("express");
const router = express.Router();
const postCtrl = require("../controllers/post");
const upload = require("../middleware/multer-config");
const auth = require("../middleware/auth");

router.post("/", auth, upload.single("image"), postCtrl.createPost);
module.exports = router;