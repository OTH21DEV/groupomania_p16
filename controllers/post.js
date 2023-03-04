const cloudinary = require("../cloudinary");
const connection = require("../mysql");

exports.createPost = async (req, res, next) => {
  //how set token in postman, see only req.auth.userId object  without token in response
  console.log(req.auth);
  const media = await cloudinary.uploader.upload(req.file.path, { width: 150, height: 150 });
  const sqlInsert =
    "INSERT INTO post (id_user,title,body,image_url,cloudinary_id) VALUES ('" +
    req.auth.userId +
    "','" +
    req.body.title +
    "', '" +
    req.body.body +
    "','" +
    media.secure_url +
    "','" +
    media.public_id +
    "' )";

  connection.query(sqlInsert, (err, result) => {
    if (!err) {
      res.json({
        message: "Post created",
      });
    } else {
      res.json({
        error: true,
        message: err,
      });
    }
  });
};
