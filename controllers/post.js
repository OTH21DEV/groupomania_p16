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
  const sqlFindPost = "SELECT * FROM post WHERE id_post = ?";

  connection.query(sqlFindPost, [req.params.id], async (err, result) => {
    if (err) {
      // Handle SQL error
      return res.status(500).json({ message: "Database query failed" });
    }

    if (!result.length) {
      // No post found
      return res.status(404).json({ message: "Post not found" });
    }

    let post = result[0];

    // Check if the user is authorized to modify the post
    if (post.id_user == req.auth.userId) {
      let updateFields = [];
      let queryParams = [];

      if (req.body.title) {
        updateFields.push("title = COALESCE(?, title)");
        queryParams.push(req.body.title);
      }

      if (req.body.body) {
        updateFields.push("body = COALESCE(?, body)");
        queryParams.push(req.body.body);
      }

      // Check for new file upload
      if (req.file) {
        try {
          // Cancel media from Cloudinary
          await cloudinary.uploader.destroy(post.cloudinary_id);

          // Upload new media to Cloudinary
          let media = await cloudinary.uploader.upload(req.file.path);
          console.log(media.secure_url, media.public_id);

          // Append new image URL and Cloudinary ID to the update fields
          updateFields.push("image_url = ?");
          updateFields.push("cloudinary_id = ?");
          queryParams.push(media.secure_url, media.public_id);
        } catch (cloudErr) {
          // Handle Cloudinary error
          return res.status(500).json({ message: "Failed to upload to Cloudinary" });
        }
      }

      // Only proceed if there are fields to update
      if (updateFields.length > 0) {
        queryParams.push(req.params.id); // Parameter for the WHERE clause

        const sqlUpdatePost = `UPDATE post SET ${updateFields.join(", ")} WHERE id_post = ?`;

        connection.query(sqlUpdatePost, queryParams, (updateErr, updateResult) => {
          if (updateErr) {
            // Handle SQL error
            return res.status(500).json({ message: "Failed to update post" });
          }
          res.json({
            message: "Post modified" + (req.file ? " with file" : ""),
          });
        });
      } else {
        // Nothing to update
        res.json({
          message: "No changes applied",
        });
      }
    } else {
      // Not authorized
      res.status(403).json({
        message: "Non authorized",
      });
    }
  });
};

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
    const comments = await getPostComments(req.params.id);

    res.json({
      error: false,
      post: post,
      comments: comments,
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
        const hasUserVoted = voteResult.some((vote) => parseInt(vote.id_user) === parseInt(req.auth.userId) && parseInt(vote.id_post) === parseInt(req.params.id));

        if (!hasUserVoted) {
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
      await incrementPostCommentsCounter(req.params.id);
      let userData = await findUser(req.auth.userId);
      await addComment(req.auth.userId, req.params.id, req.body.parent_id, userData[0].pseudo, req.body.body, currentDate);
      console.log(userData[0].pseudo);
      return res.json({
        error: false,
        message: "Comment added",
        commentedBy: userData,
      });
    }
  } catch (error) {
    res.json({
      error: true,
      message: error.message,
    });
  }
};

function incrementPostCommentsCounter(postId) {
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

function addComment(userId, postId, parentId, pseudo, body, date) {
  return new Promise((resolve, reject) => {
    const sql = "INSERT INTO comments_post (id_user, id_post,parent_id,pseudo, body,date) VALUES (?, ?, ?, ?, ?,?)";
    connection.query(sql, [userId, postId, parentId, pseudo, body, date], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result[0]);
      }
    });
  });
}

function findUser(userId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM user WHERE id_user = ?";
    connection.query(sql, [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function getPostComments(postId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM comments_post WHERE id_post = ?";
    connection.query(sql, [postId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        const list = listToTree(result);

        const flatList = treeToList(list, (item, level) => {
          return {
            ...item,
            level,
          };
        });
        console.log(flatList);
        resolve(flatList);
      }
    });
  });
}

function treeToList(tree, callback, parentId = null, level = 0, excludeParent = false) {
  let result = [];

  for (const item of tree) {
    const newItem = { ...item };
    if (parentId !== null) {
      newItem.id_comments = parentId;
    }

    if (!excludeParent) {
      result.push(callback ? callback(newItem, level) : newItem);
    }

    if (item.children?.length) {
      const childrenList = treeToList(item.children, callback, item.id_comments, level + 1, true);
      result = result.concat(childrenList);
    }
  }

  return result;
}

function listToTree(list) {
  let commentMap = {};
  let roots = [];

  // First pass: Create a map of comments using their IDs as keys
  for (const item of list) {
    const comment = {
      ...item,
      children: [],
    };

    commentMap[comment.id_comments] = comment;
  }

  // Second pass: Build the tree structure
  for (const item of list) {
    const comment = commentMap[item.id_comments];
    const parentComment = commentMap[item.parent_id];

    if (parentComment) {
      parentComment.children.push(comment); // Add the comment as a child to the parent comment
    } else {
      roots.push(comment); // Add the comment as a root comment
    }
  }

  return roots;
}
