const express = require("express");
const router = express.Router();
const postCtrl = require("../controllers/post");
const upload = require("../middleware/multer-config");
const auth = require("../middleware/auth");

router.post("/", auth, upload.single("image"), postCtrl.createPost);
router.put("/:id", auth, upload.single("image"), postCtrl.modifyPost);
router.delete("/:id", auth, postCtrl.deletePost);
router.get("/:id", auth, postCtrl.getOnePost);
router.get("/", auth, postCtrl.getAllPosts);
module.exports = router;