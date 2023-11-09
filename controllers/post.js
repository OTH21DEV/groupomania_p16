const cloudinary = require("../cloudinary");
const connection = require("../mysql");
const dotenv = require("dotenv");
dotenv.config();

exports.createPost = async (req, res, next) => {
  function validateFields(req) {
    let message = {};
    if (!req.body.title) {
      message.title = "Please fill in title";
    }
    if (!req.body.body) {
      message.body = "Please fill in description";
    }

    return message;
  }

  const message = validateFields(req);

  try {
    console.log(req.auth);

    // Check if title and body fields are not empty
    if (!req.body.title || !req.body.body) {
      return res.json({
        error: true,
        message: message,
      });
    }

    let media = {};
    if (req.file) {
      // media = await cloudinary.uploader.upload(req.file.path, { width: 150, height: 150 });
      media = await cloudinary.uploader.upload(req.file.path, { height: 150 });
    }

    const sqlFindUserPseudo = "SELECT * FROM user WHERE id_user = '" + req.auth.userId + "' ";

    connection.query(sqlFindUserPseudo, (err, result) => {
      console.log(result[0]);
      // Check the row in the user table. Result is an array with object (id_user, email, password)
      if (result.length === 0) {
        res.json({
          error: true,
          message: message,
        });
      }
      if (result.length > 0) {
        console.log(result[0].pseudo);
        const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ");
        console.log(currentDate);
        const sqlInsert =
          "INSERT INTO post (id_user,pseudo, title,body,image_url,cloudinary_id,date) VALUES ('" +
          req.auth.userId +
          "','" +
          result[0].pseudo +
          "','" +
          req.body.title +
          "', '" +
          req.body.body +
          "','" +
          media.secure_url +
          "','" +
          media.public_id +
          "','" +
          currentDate +
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
      }
    });
  } catch (error) {
    res.json({
      error: true,
      message: error.message,
    });
  }
};

exports.modifyPost = async (req, res, next) => {
  //check to modify query on  req.params.id
  const sqlFindPost = "SELECT * FROM post WHERE id_post = '" + req.params.id + "' ";

  connection.query(sqlFindPost, async (err, result) => {
    console.log(result[0].id_user);
    console.log(req.auth.userId);
    //check the id of user or admin
    // if (result[0].id_user === req.auth.userId || req.auth.userId === 1) {
    if (result[0].id_user == req.auth.userId) {
      //check if there is a new file added
      if (req.file) {
        //cancel media from Cloudinary
        await cloudinary.uploader.destroy(result[0].cloudinary_id);
        //upload new media to Cloudinary
        let media = await cloudinary.uploader.upload(req.file.path);

        //COALESCE update title, body if not null, otherwise returns existing value
        const sqlUpdatePost = "UPDATE post SET title = COALESCE(?, title),body= COALESCE(?, body),image_url=?,cloudinary_id=? WHERE id_post = '" + req.body.id_post + "' ";

        connection.query(sqlUpdatePost, [req.body.title, req.body.body, media.secure_url, media.public_id], (err, result) => {
          res.json({
            message: "Post modified with file",
          });
        });
      }
      //if there isn't new file update with req.body values
      else {
        const sqlUpdatePost = "UPDATE post SET title = COALESCE(?, title),body= COALESCE(?, body) WHERE id_post = '" + req.params.id + "' ";
        connection.query(sqlUpdatePost, [req.body.title, req.body.body], (err, result) => {
          if (!err) {
            res.json({
              message: "Post modified",
            });
          } else {
            res.json({
              message: "Non TEST authorized",
            });
          }
        });
      }
    }
    //refuse connection if not owner of the post or admin
    else {
      res.json({
        message: "Non authorized",
      });
    }
  });
};
//V1
// exports.deletePost = (req, res, next) => {
//   const sqlFindPost = "SELECT * FROM post WHERE id_post = '" + req.params.id + "' ";
//   connection.query(sqlFindPost, async (err, result) => {
//     //check if the user is a owner of the Post object or admin wit id 18
//     //compare the id of user in DB with req.auth.userId (received once user is logged )

//     console.log(result[0].id_user)
//     console.log(req.auth.userId)
//     if (result[0].id_user === req.auth.userId ) {
//     // if (result[0].id_user === req.auth.userId || req.auth.userId === 1) {
//       //Delete image from cloudinary
//       cloudinary.uploader.destroy(result[0].cloudinary_id);
//       const sqlDeletePost = "DELETE FROM post WHERE id_post = '" + req.params.id + "' ";
//       connection.query(sqlDeletePost, async (err, result) => {
//         if (!err) {
//           res.json({
//             message: "Post deleted",
//           });
//         } else {
//           res.json({
//             error: true,
//             message: err,
//           });
//         }
//       });
//     } else {
//       res.status(401).json({ message: "Not authorized" });
//     }
//   });
// };

exports.deletePost = async (req, res, next) => {
  const sqlFindPost = "SELECT * FROM post WHERE id_post = '" + req.params.id + "' ";
  connection.query(sqlFindPost, async (err, result) => {
    //check if the user is a owner of the Post object or admin wit id 18
    //compare the id of user in DB with req.auth.userId (received once user is logged )

    console.log(result[0].id_user);
    console.log(req.auth.userId);
    if (result[0].id_user === req.auth.userId) {
      // if (result[0].id_user === req.auth.userId || req.auth.userId === 1) {
      //Delete image from cloudinary
      cloudinary.uploader.destroy(result[0].cloudinary_id);
      const sqlDeletePost = "DELETE FROM post WHERE id_post = '" + req.params.id + "' ";

      connection.query(sqlDeletePost, async (err, result) => {
        if (!err) {
          await sqlFindIfVoted(req.params.id);
          await sqlDeleteFromVote(req.params.id);
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
    } else {
      res.status(401).json({ message: "Not authorized" });
    }
  });
};

function sqlFindIfVoted(postId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM votes_post WHERE id_post = ?";
    connection.query(sql, [postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.length > 0);
      }
    });
  });
}

function sqlDeleteFromVote(postId) {
  return new Promise((resolve, reject) => {
    const sql = "DELETE FROM votes_post WHERE id_post = ?";
    connection.query(sql, [postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.length > 0);
      }
    });
  });
}
/////////

exports.getOnePost = async (req, res, next) => {
  try {
    const post = await sqlFindPost(req.params.id);

    if (!post) {
      return res.json({
        error: true,
        message: "Post not found",
      });
    }

    const isAuthor = post.id_user === req.auth.userId;
    const hasUserVoted = await sqlFindVote(req.auth.userId, req.params.id);

    res.json({
      error: false,
      message: post,
      isAuthor: isAuthor,
      isVoted: hasUserVoted,
    });
  } catch (err) {
    res.json({
      error: true,
      message: err.message,
    });
  }
};

function sqlFindPost(postId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM post WHERE id_post = ?";
    connection.query(sql, [postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

function sqlFindVote(userId, postId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM votes_post WHERE id_user = ? AND id_post = ?";
    connection.query(sql, [userId, postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.length > 0);
      }
    });
  });
}

///////////////////////////////
exports.getAllPosts = async (req, res, next) => {
  const sqlFindAllPosts = "SELECT * FROM post ";
  connection.query(sqlFindAllPosts, async (err, result) => {
    if (!err) {
      res.json({
        message: result,
      });
    } else {
      res.json({
        error: true,
        message: err,
      });
    }
  });
};

exports.postNotation = (req, res, next) => {
  // FIND POST in table post
  const sqlFindPost = "SELECT * FROM post WHERE id_post = '" + req.params.id + "' ";
  connection.query(sqlFindPost, async (err, result) => {
    if (!err) {
      // FIND VOTE in table votes_post
      const sqlFindVote = "SELECT * FROM votes_post WHERE id_user = '" + req.auth.userId + "' ";
      connection.query(sqlFindVote, async (err, voteResult) => {
        // console.log(voteResult);
        // console.log(req.auth.userId);
        // if (req.body.like == 1) {
        console.log(req.body.like);
        // const hasUserVoted = voteResult.some(vote => vote.id_user === req.auth.userId && (vote.id_post === req.params.id));
        const hasUserVoted = voteResult.some((vote) => parseInt(vote.id_user) === parseInt(req.auth.userId) && parseInt(vote.id_post) === parseInt(req.params.id));
        // console.log(hasUserVoted);
        if (!hasUserVoted) {
          // console.log(req.params.id);
          // UPDATE POST in table post with +1 like
          // If expr1 is not NULL, IFNULL() returns expr1; otherwise it returns expr2
          const sqlUpdatePost = "UPDATE post SET likes = IFNULL(likes, 0) + 1 WHERE id_post = '" + req.params.id + "' ";
          connection.query(sqlUpdatePost, async (err, result) => {
            console.log("Your vote is registered in the table Post");
            // Insert data in table votes_post
            const sqlInsertVotes = "INSERT INTO votes_post (id_user,id_post) VALUES ('" + req.auth.userId + "','" + req.params.id + "' )";
            connection.query(sqlInsertVotes, async (err, result) => {
              console.log("Your vote is registered in the table vote");
              res.json({
                error: false,
                message: "Your vote is registered in the table vote",
              });
            });
          });
        } else {
          const sqlUpdatePost = "UPDATE post SET likes = IFNULL(likes, 0) - 1 WHERE id_post = '" + req.params.id + "' ";
          connection.query(sqlUpdatePost, async (err, result) => {
            // Insert data in table votes_post
            const sqlDeleteVote = "DELETE FROM votes_post WHERE id_post = '" + req.params.id + "' AND id_user = '" + req.auth.userId + "'";

            connection.query(sqlDeleteVote, async (err, result) => {
              console.log("Your vote is canceled");
              res.json({
                error: false,
                message: "Your vote is canceled",
              });
            });
          });
        }
      });
    } else {
      res.json({
        error: true,
        message: err,
      });
    }
  });
};

exports.postComment = async (req, res, next) => {
  try {
    const post = await sqlFindPost(req.params.id);
    const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (!post) {
      return res.json({
        error: true,
        message: "Post not found",
      });
    } else {
      await sqlAddCommentToPost(req.params.id);
      await sqlAddCommentToComments(req.auth.userId,req.params.id,req.params.parent_id,req.body.body,currentDate);
      return res.json({
        error: false,
        message: "Comment added",
      });
    }
  } catch(error) {
    res.json({
      error: true,
      message: error.message,
    });
  }
  // FIND POST in table post
};

function sqlAddCommentToPost(postId) {
  return new Promise((resolve, reject) => {
    const sql = "UPDATE post SET comments = IFNULL(comments, 0) + 1 WHERE id_post = ?";
    connection.query(sql, [postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

function sqlAddCommentToComments(userId, postId, parentId, body,date) {
  return new Promise((resolve, reject) => {
    // const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ");

    const sql =
      "INSERT INTO comments_post (id_user, id_post,parent_id,body,date) VALUES (?, ?, ?, ?, ?)";
    connection.query(sql, [userId, postId, parentId, body, date], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

// Managing the assignment of `parent_comment_id` in your front-end depends on how you are structuring and displaying your comments. Here is a general approach:

// 1. When rendering the comments, you can maintain a data structure that represents the hierarchy of comments. Each comment object should have properties like `id`, `parent_comment_id`, and `content`.

// 2. Assign a unique `id` to each comment when it is created. You can generate this `id` either on the client-side or server-side.

// 3. Upon rendering, you need to determine the parent comment for each comment. If a comment is a reply to another comment, set its `parent_comment_id` to the `id` of the comment it is responding to. If it is a top-level comment (not a reply), consider setting its `parent_comment_id` to null or some sentinel value.

// 4. Implement a user interface that allows users to reply to comments. When a user selects the "Reply" button or similar action, capture the `id` of the comment they are responding to.

// 5. When submitting the form or creating the new comment, include the captured `id` as the `parent_comment_id` for the new comment. This ensures that the new comment is associated with the appropriate parent comment.

// Remember to update the underlying data structure and re-render the comments section to reflect the changes whenever a new comment is added or a reply is made.

// By maintaining this hierarchical data structure and handling the assignment of `parent_comment_id` accordingly, you can easily manage the organization of comments and their replies in your front-end application.