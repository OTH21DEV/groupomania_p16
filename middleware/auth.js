const jwt = require("jsonwebtoken");

//this middlewarre control if user is connected
//and send the information to different fonction which will manage the request
module.exports = (req, res, next) => {
  try {
    //taking the token from header authorization of entered request (include Bearer)
    const token = req.headers.authorization.split(" ")[1];

    //decode the token with 2 arguments (token and secret code)
    const decodedToken = jwt.verify(token, "RANDOM_TOKEN_SECRET");

    //take the userId again from received token object while login - controller user
    const userId = decodedToken.userId;
    //add this userId to Request Object for use in the different routes
    req.auth = {
      userId: userId,
    };
    next();
  } catch (error) {
    res.status(401).json({ error });
  }
};