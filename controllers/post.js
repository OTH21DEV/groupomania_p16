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

// exports.getOnePost = async (req, res, next) => {
//   try {
//     const post = await sqlFindPost(req.params.id);

//     if (!post) {
//       return res.json({
//         error: true,
//         message: "Post not found",
//       });
//     }

//     const isAuthor = post.id_user === req.auth.userId;
//     const hasUserVoted = await sqlFindVote(req.auth.userId, req.params.id);
//     const comments = await getPostComments(req.params.id)

//     res.json({
//       error: false,
//       post: post,
//       comments: comments,
//       isAuthor: isAuthor,
//       isVoted: hasUserVoted,
//     });
//   } catch (err) {
//     res.json({
//       error: true,
//       message: err.message,
//     });
//   }
// };

//test

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
    // const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ");

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

///////////////////////////////
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
        // console.log(result);
        const list = listToTree(result); // Extract list and commentMap from listToTree result
        console.log(result);
        console.log(list)

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
//Working without children
// function treeToList(comments) {
//   const treeMap = {};
//   const result = [];

//   // Create a mapping of comments by their id_comments
//   for (const comment of comments) {
//     comment.children = [];
//     treeMap[comment.id_comments] = comment;
//   }

//   // Build the tree structure by adding children to their parent comments
//   for (const comment of comments) {
//     if (comment.parent_id && treeMap[comment.parent_id]) {
//       treeMap[comment.parent_id].children.push(comment);
//     } else {
//       result.push(comment);
//     }
//   }

//   return result;
// }

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
// //Working
// function treeToList(tree, callback, level = 0, result = []) {
//   // Iterate over each item in the input tree.
//   for (const item of tree) {
//     // If a callback is provided, call the callback with the current item and level, and push the result to the output array. Otherwise, push the current item directly to the output array.
//     result.push(callback ? callback(item, level) : item);

//     // If the current item has children, recursively call the function with the children as the new input tree, an updated level, and the same output array being built up by the parent call.
//     // if (item.children?.length) treeToList(item.children, callback, level + 1, result);
//     if (item.children?.length) {
//       treeToList(item.children, callback, level + 1, result);
//     }
//   }

//   // Return the final output array.
//   return result;
// }

//v2 with one duplicate
// function listToTree(list) {
//   let commentMap = {};
//   let roots = [];

//   for (const item of list) {
//     const comment = {
//       ...item,
//       children: []
//     };

//     commentMap[comment.id_comments] = comment;

//     // If the comment has a parent, add it as a child to the parent comment
//     if (comment.parent_id !== null && commentMap.hasOwnProperty(comment.parent_id)) {
//       const parentComment = commentMap[comment.parent_id];

//       parentComment.children.push(comment); // Add the comment as a child to the parent comment
//     } else {
//       // If the comment doesn't have a parent, add it as a root comment
//       roots.push(comment);
//     }
//   }

//   return roots;
// }

// // working with doublon
// function listToTree(list) {
//   let trees = {};
//   let roots = {};

//   for (const item of list) {
//     // Adding the item to the node index and creating the children property
//     if (!trees[item.id_comments]) {
//       trees[item.id_comments] = item;
//       trees[item.id_comments].children = [];

//     } else {
//       trees[item.id_comments] = { ...trees[item.id_comments], ...item };
//     }

//     // If the item has a parent, add it to the parent's children
//     if (item.parent_id) {
//       // If the parent is not yet in the index, create an entry for it with an empty children array, since we know the id_comments of the parent
//       if (!trees[item.parent_id]) trees[item.parent_id] = { children: [] };

//       // Add to the parent's children
//       trees[item.parent_id].children.push(trees[item.id_comments]);
//     }

//     // Add the comment to the roots object regardless of whether it has a parent_id or not
//     roots[item.id_comments] = trees[item.id_comments];
//   }

//   return Object.values(roots);
// }

// Managing the assignment of `parent_comment_id` in your front-end depends on how you are structuring and displaying your comments. Here is a general approach:

// 1. When rendering the comments, you can maintain a data structure that represents the hierarchy of comments. Each comment object should have properties like `id`, `parent_comment_id`, and `content`.

// 2. Assign a unique `id` to each comment when it is created. You can generate this `id` either on the client-side or server-side.

// 3. Upon rendering, you need to determine the parent comment for each comment. If a comment is a reply to another comment, set its `parent_comment_id` to the `id` of the comment it is responding to. If it is a top-level comment (not a reply), consider setting its `parent_comment_id` to null or some sentinel value.

// 4. Implement a user interface that allows users to reply to comments. When a user selects the "Reply" button or similar action, capture the `id` of the comment they are responding to.

// 5. When submitting the form or creating the new comment, include the captured `id` as the `parent_comment_id` for the new comment. This ensures that the new comment is associated with the appropriate parent comment.

// Remember to update the underlying data structure and re-render the comments section to reflect the changes whenever a new comment is added or a reply is made.

// By maintaining this hierarchical data structure and handling the assignment of `parent_comment_id` accordingly, you can easily manage the organization of comments and their replies in your front-end application.

// "comments": [
//   {
//       "id_comments": 19,
//       "id_user": 65,
//       "id_post": 40,
//       "parent_id": 0,
//       "pseudo": "azerty",
//       "body": null,
//       "date": "2023-11-15T12:36:51.000Z",
//       "children": [
//           {
//               "id_comments": 20,
//               "id_user": 65,
//               "id_post": 40,
//               "parent_id": 19,
//               "pseudo": "azerty",
//               "body": null,
//               "date": "2023-11-15T12:41:50.000Z",
//               "children": [],
//               "level": 0
//           }
//       ],
//       "level": 0
//   },
//   {
//       "id_comments": 21,
//       "id_user": 65,
//       "id_post": 40,
//       "parent_id": 0,
//       "pseudo": "azerty",
//       "body": null,
//       "date": "2023-11-15T12:48:34.000Z",
//       "children": [],
//       "level": 0
//   },
//   ...
// ]
