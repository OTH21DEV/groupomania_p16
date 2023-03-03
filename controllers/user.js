const bcrypt = require("bcrypt");
const connection = require("../mysql");
//const User = require("../models/user");
const jwt = require("jsonwebtoken");
const cloudinary = require("../cloudinary");

exports.signup = (req, res, next) => {
  let message = {};
  if (!req.body.email) {
    message = "Please fill in email";
  }
  if (!req.body.password) {
    message = "Please fill in password";
  } else if (req.body.password.length < 4 || req.body.password.length > 24) {
    message = "Password must be between 4 and 24 characters";
  }

  if (Object.keys(message).length > 0) {
    res.json({
      error: true,
      message: message,
    });
  } else {
    let password = bcrypt.hashSync(req.body.password, 10);
    const sqlCheckUserEmail = "SELECT * FROM user WHERE email = '" + req.body.email + "' ";

    connection.query(sqlCheckUserEmail, async (err, result) => {
      //check the row in the user table .Result is an array with object (id_user, email, password)
      if (result.length > 0) {
        res.json({
          error: true,
          message: "User already exist",
        });
      } else {
        

        const media = await cloudinary.uploader.upload(req.file.path);
        const sqlInsert =
          "INSERT INTO user (email, password,pseudo,avatar_url,cloudinary_id) VALUES ('" +
          req.body.email +
          "', '" +
          password +
          "','" +
          req.body.pseudo +
          "','" +
          media.secure_url +
          "','" +
          media.public_id +
          "' )";

        connection.query(sqlInsert, (err, result) => {
          if (!err) {
            res.json({
              message: "User created",
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
  }
};

exports.login = (req, res, next) => {
  const sqlCheckUserEmail = "SELECT * FROM user WHERE email = '" + req.body.email + "' ";

  connection.query(sqlCheckUserEmail, (err, result) => {
    console.log(result.length);
    //check the row in the user table .Result is an array with object (id_user, email, password)
    if (result.length === 0) {
      res.json({
        error: true,
        message: "Incorrect credentials",
      });
    }
    if (result.length > 0) {
      console.log(result[0].password);
      bcrypt.compare(req.body.password, result[0].password, (err, resp) => {
        if (err) {
          res.json({
            error: true,
            message: "Incorrect credentials",
          });
        } else {
          res.status(200).json({
            userId: result[0].id_user,
            //token arguments (data to encode - here id user from db, secret key for encode,
            //configuration of token validity)
            token: jwt.sign({ userId: result[0].id_user }, "RANDOM_TOKEN_SECRET", { expiresIn: "24h" }),
          });
        }
      });
    }
  });
};
