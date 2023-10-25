const bcrypt = require("bcrypt");
const connection = require("../mysql");
const jwt = require("jsonwebtoken");
const cloudinary = require("../cloudinary");

const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

exports.signup = (req, res, next) => {
  function validateFields(req) {
    let message = {};
    if (!req.body.email) {
      message.email = "Please fill in email";
    }
    if (!req.body.password) {
      message.password = "Please fill in password";
    }
    if (!req.body.pseudo) {
      message.pseudo = "Please fill in pseudo";
    } else if (req.body.password.length < 4 || req.body.password.length > 24) {
      message.password = "Password must be between 4 and 24 characters";
    }

    return message;
  }

  const message = validateFields(req);

  if (Object.keys(message).length > 0) {
    res.json({
      error: true,
      message: message,
    });
    return;
  } else {
    let password = bcrypt.hashSync(req.body.password, 10);
    const sqlCheckUserEmail = "SELECT * FROM user WHERE email = '" + req.body.email + "' ";

    connection.query(sqlCheckUserEmail, async (err, result) => {
      //check the row in the user table .Result is an array with object (id_user, email, password)
      if (result.length > 0) {
        res.json({
          error: true,
          message: "User already exists",
        });
      } else {
        if (req.file) {
          const media = await cloudinary.uploader.upload(req.file.path, { width: 150, height: 150, gravity: "auto", crop: "fill", radius: "max" });
          const sqlInsert =
            "INSERT INTO user (email, password, pseudo, avatar_url, cloudinary_id) VALUES ('" +
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
        } else {
          const sqlInsert = "INSERT INTO user (email, password, pseudo) VALUES ('" + req.body.email + "', '" + password + "','" + req.body.pseudo + "')";

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
      }
    });
  }
};

exports.login = (req, res, next) => {
  function validateFields(req) {

    let message = {};

    if (!req.body.email) {
      message.email = "Please fill in email";
    }
    if (!req.body.password) {
      message.password = "Please fill in password";
    }

    if (req.body.password && !req.body.email) {
      message.error = "Incorrect credentials";
    }

    return message;
  }

  let message = validateFields(req);

  if (req.body.email && req.body.password) {
    const sqlCheckUserEmail = "SELECT * FROM user WHERE email = '" + req.body.email + "' ";

    connection.query(sqlCheckUserEmail, (err, result) => {
      console.log(result[0]);
      // Check the row in the user table. Result is an array with object (id_user, email, password)
      if (result.length === 0) {
        res.json({
          error: true,
          message: message,
        });
      }
      if (result.length > 0) {
        console.log(result[0].password);
        bcrypt.compare(req.body.password, result[0].password, (err, resp) => {
          if (err || !resp) {
            res.json({
              error: true,
              message: "Incorrect credentials",
            });
          } else {
            res.status(200).json({
              userId: result[0].id_user,
              pseudo: result[0].pseudo,
              avatarUrl:result[0].avatar_url,
              token: jwt.sign({ userId: result[0].id_user }, "RANDOM_TOKEN_SECRET", { expiresIn: "24h" }),
            });
          }
        });
      }
    });
  } else {
    res.json({
      error: true,
      message: message,
    });
  }
};

exports.forgotPassword = (req, res, next) => {
  const sqlCheckUserEmail = "SELECT * FROM user WHERE email = '" + req.body.email + "' ";

  connection.query(sqlCheckUserEmail, (err, result) => {
    // Function to validate fields and return error messages
    function validateFields(req) {
      let message = {};

      if (!req.body.email) {
        message.error = "Please fill in email";
      } else {
        message.error = "Incorrect credentials";
      }

      return message;
    }

    let message = validateFields(req);

    console.log(result[0]);
    // Check the row in the user table. Result is an array with object (id_user, email, password)
    if (result.length === 0) {
      res.json({
        error: true,
        message: message,
      });
    }
    if (result.length > 0) {
      console.log(result[0].email);
      const recoveryToken = jwt.sign({}, "RANDOM_TOKEN_SECRET", { expiresIn: "5m" });
      // console.log(newToken)
      const sqlUpdateUserRecoveryToken = "UPDATE user SET recovery_token = COALESCE(?, recovery_token) WHERE email=?";

      connection.query(sqlUpdateUserRecoveryToken, [recoveryToken, req.body.email], (err, result) => {
        if (err) throw err;

        const transporter = nodemailer.createTransport({
          service: process.env.SERVICE,
          host: process.env.HOST,
          port: process.env.SERVICE_PORT,
          secure: false,
          auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
          },
        });
        const mailOptions = {
          from: process.env.EMAIL,
          // to: result[0].email,
          to: req.body.email,
          // to: "otheis@protonmail.com",
          subject: "Password Reset",
          text: `Click on the following link to reset your password: http://localhost:3001/reset-password?token=${recoveryToken}.`,
        };

        transporter.sendMail(mailOptions, function (error, response) {
          console.log(response);
          if (error) {
            console.log("Error sending password reset email:", error);
          } else {
            console.log("Password reset email sent successfully");
          }
        });
      });

      res.status(200).json({
        userId: result[0].id_user,
        // token: result[0].recovery_token
        token: recoveryToken,
        error: false,
        message: "Password reset link sent successfully to your email ",
      });
    }
  });
};

exports.resetPassword = (req, res, next) => {
  const authToken = req.query.token;
  console.log(req.body.password);
  // console.log(authToken);

  const sqlCheckUserRecoveryToken = "SELECT * FROM user WHERE recovery_token = '" + authToken + "' ";

  connection.query(sqlCheckUserRecoveryToken, (err, result) => {
    // Function to validate fields and return error messages
    function validateFields(req) {
      let message = {};

      if (!req.body.password) {
        message.password = "Please fill in password";
      }

      return message;
    }

    let message = validateFields(req);

    // Check the row in the user table. Result is an array with object (id_user, email, password)

    if (result.length > 0) {
      let password = bcrypt.hashSync(req.body.password, 10);
      console.log(req.body.password);
      // const sqlUpdateUserPassword = "UPDATE user SET password = COALESCE(?, password) WHERE recovery_token=?";
      const sqlUpdateUserPassword = "UPDATE user SET password = ? WHERE recovery_token=?";
      connection.query(sqlUpdateUserPassword, [password, authToken], (err, result) => {
        if (!err) {
          res.json({
            message: "Password modified",
          });
        } else {
          res.json({
            error: true,
            message: err,
          });
        }
      });
    } else {
      res.json({
        error: true,
        message: message,
      });
    }
  });
};
