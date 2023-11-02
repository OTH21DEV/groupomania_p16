const express = require("express");
const router = express.Router();
const postCtrl = require("../controllers/post");
const upload = require("../middleware/multer-config");
const auth = require("../middleware/auth");

router.post("/new-post", auth, upload.single("image"), postCtrl.createPost);
router.post("/post/:id/like", auth, postCtrl.postNotation);
router.put("/:id", auth, upload.single("image"), postCtrl.modifyPost);
router.delete("/:id", auth, postCtrl.deletePost);
// router.get("/post?:id", auth, postCtrl.getOnePost);
router.get("/post/:id", auth, postCtrl.getOnePost);
router.get("/", auth, postCtrl.getAllPosts);
module.exports = router;
