const express = require("express");
const router = express.Router();
const postCtrl = require("../controllers/post");
const upload = require("../middleware/multer-config");
const auth = require("../middleware/auth");

router.post("/new-post", auth, upload.single("image"), postCtrl.createPost);
router.post("/post/:id/like", auth, postCtrl.postNotation);
router.put("/modify-post/:id", auth, upload.single("image"), postCtrl.modifyPost);
router.delete("/post/:id", auth, postCtrl.deletePost);

router.get("/post/:id", auth, postCtrl.getOnePost);

router.get("/", auth, postCtrl.getAllPosts);
// router.post("/post/:id/:parent_id", auth, postCtrl.postComment);
router.post("/post/:id", auth, postCtrl.postComment);
module.exports = router;
