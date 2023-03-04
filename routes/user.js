const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/user");
const upload = require("../middleware/multer-config");

router.post("/signup",upload.single("image"), userCtrl.signup);
//any() handle multipart form data
router.post("/login", upload.any(),userCtrl.login);

module.exports = router;