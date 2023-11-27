/**
 * MYSQL connection
 */
const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  multipleStatements: true,
});

connection.connect((err) => {
  if (err) {
    throw err;
  } else {
    console.log("Connected!");
  }
});

module.exports = connection;
