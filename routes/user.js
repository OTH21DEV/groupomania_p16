const express = require("express");
const router = express.Router();
const userCtrl = require("../controllers/user");
const upload = require("../middleware/multer-config");



// // Handle the case when the page reloads after the signup process
// router.post("/signup", upload.single("image"), userCtrl.signup, (req, res) => {
//     // Redirect the user to the login page
//     res.redirect("/login");
// });


router.post("/signup",upload.single("image"), userCtrl.signup);
//any() handle multipart form data
router.post("/login", upload.any(),userCtrl.login);
router.post("/forgot-password", upload.any(),userCtrl.forgotPassword);
router.post("/reset-password?:token", upload.any(),userCtrl.resetPassword);




module.exports = router;