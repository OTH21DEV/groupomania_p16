const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/user");
const upload = require("../middleware/multer-config");

router.post("/signup",upload.single("image"), userCtrl.signup);
router.post("/login", userCtrl.login);

module.exports = router;