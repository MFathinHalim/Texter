import type { Express } from "express";
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import path from "path";

//import routernya
import router from "./Router/main";
//? dotenv config
dotenv.config();

const app: Express = express(); //bikin expressnya
const port: number | string = process.env.PORT || 3000; //bikin port :D

app.set("view engine", "ejs"); //set view enginenya jadi ejs
app.use(express.static(path.join(__dirname, "/public"))); //TODO buat frontendnya, css js image di taruh di public

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 15 menit
  max: 5, // maksimal 1 request setiap 15 menit
  message: "Try Again Later:D.",
});
const limiterSignup = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 menit
  max: 1, // maksimal 1 request setiap 15 menit
  message: "Try Again Later:D.",
});
app.use("/post", limiter);
function postOnlyLimiter(req, res, next) {
  if (req.method === "POST") {
    return limiterSignup(req, res, next);
  }
  next();
}
app.use("/signup", postOnlyLimiter);

//? Jalankan Routernya
app.use("/", router); //* Router Posts
//Run app nya sesuai port
mongoose.set("strict", false);
mongoose.connect(process.env.MONGODBURI || "").then(() => {
  app.listen(port, () => {
    console.log(`[app]: berjalan pada: http://localhost:${port}`); //TODO di Log biar jelas udah jalan atau kagak
  });
});
