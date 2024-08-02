import type { Express, NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import path from "path";

//import routernya
import router from "./Router/main";
//? dotenv config
dotenv.config();

const app: Express = express(); //TODO bikin expressnya
const port: number | string = process.env.PORT || 3000; //TODO bikin port :D

app.set("view engine", "ejs"); //? set view enginenya jadi ejs
app.use(express.static(path.join(__dirname, "/public"))); //TODO buat frontendnya, css js image di taruh di public

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Rate Limit
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, //? 5 menit
  max: 5,
  message: "Coba lagi 5 menit",
});
const limiterSignup = rateLimit({
  windowMs: 60 * 60 * 1000, //? 1 jam
  max: 1,
  message: "Coba lagi 1 jam",
});
function postOnlyLimiter(req: Request, res: Response, next: NextFunction) {
  if (req.method === "POST") {
    return limiterSignup(req, res, next);
  }
  next();
}
// uset post limit
app.use("/post", limiter);
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
