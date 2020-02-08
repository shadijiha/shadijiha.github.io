/**
 * Main file for the website
 */

const express = require("express");
const app = express();
const server = require("http").Server(app);

// Establish route
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/client/index.html");
});
app.use("/", express.static(__dirname + "/"));

server.listen(4000);
console.log("Server is listening to 4000");
