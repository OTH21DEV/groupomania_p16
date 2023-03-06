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

exports.modifyPost = async (req, res, next) => {
  if (req.file) {
    const sqlCheckPost = "SELECT * FROM post WHERE id_post = '" + req.body.id_post + "' ";
    connection.query(sqlCheckPost, async (err, result) => {
      //cancel media from Cloudinary
      await cloudinary.uploader.destroy(result[0].cloudinary_id);
    });
    //upload new media to Cloudinary
    let media = await cloudinary.uploader.upload(req.file.path);
    //COALESCE update title, body if not null, otherwise returns existing value
    const sqlUpdatePost = "UPDATE post SET title = COALESCE(?, title),body= COALESCE(?, body),image_url=?,cloudinary_id=? WHERE id_post = '" + req.body.id_post + "' ";
    connection.query(sqlUpdatePost, [req.body.title, req.body.body, media.secure_url, media.public_id], (err, result) => {
      if (!err) {
        res.json({
          message: "Post modified with file",
        });
      } else {
        res.json({
          error: true,
          message: err,
        });
      }
    });
  } else {
    //COALESCE update title, body if not null, otherwise returns existing value
    const sqlUpdatePost = "UPDATE post SET title = COALESCE(?, title),body= COALESCE(?, body) WHERE id_post = '" + req.body.id_post + "' ";
    connection.query(sqlUpdatePost, [req.body.title, req.body.body], (err, result) => {
      if (!err) {
        res.json({
          message: "Post modified",
        });
      } else {
        res.json({
          error: true,
          message: err,
        });
      }
    });
  }
};

exports.deletePost = (req, res, next) => {
  const sqlFindPost = "SELECT * FROM post WHERE id_post = '" + req.params.id + "' ";
  connection.query(sqlFindPost, async (err, result) => {
    if (result[0].id_user != req.auth.userId) {
      res.json({
        message: "Not authorized",
      });
    }
    if (err) {
      res.json({
        error: true,
        message: err,
      });
    } else {
      //Delete image from cloudinary
      cloudinary.uploader.destroy(result[0].cloudinary_id);
      const sqlDeletePost = "DELETE FROM post WHERE id_post = '" + req.params.id + "' ";
      connection.query(sqlDeletePost, async (err, result) => {
        if (!err) {
          res.json({
            message: "Post deleted",
          });
        } else {
      
          res.json({
            error: true,
            message: err,
          });
        }
      });
    }
  });
};
