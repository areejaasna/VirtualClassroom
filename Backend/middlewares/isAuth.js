const jwt = require("jsonwebtoken");
require('dotenv').config();

const isAuthenticated = async (req, res, next) => {
  //! Get the token from the header
  const headerObj = req.headers;
  const token = headerObj.authorization ? headerObj.authorization.split(" ")[1] : null;
  if (!token) {
      return res.status(401).json({ message: "Authorization token is missing or invalid." });
  }

  //Verify token
  const verifyToken = jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return false;
    } else {
      return decoded;
    }
  });
  if (verifyToken) {
    //save the user into req.obj
    req.user = verifyToken.id;
    next();
  } else {
    const err = new Error("Token expired please login again");
    next(err);
  }
};

module.exports = isAuthenticated;
