import type { Express, NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import path from "path";
const cookieParser = require("cookie-parser");
//import routernya
import router from "./Router/main";
//? dotenv config
dotenv.config();

const app: Express = express(); //TODO bikin expressnya
const port: number | string = process.env.PORT || 3000; //TODO bikin port :D

app.set("view engine", "ejs"); //? set view enginenya jadi ejs
app.use("/", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
app.use("/", router);
app.get("*", (req: Request, res: Response) => {
  res.status(404).render("notfound", { searchTerm: "" });
});
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(404).render("notfound", { searchTerm: "" });
});
//Run app nya sesuai port
mongoose.set("strict", false);
mongoose.connect(process.env.MONGODBURI || "").then(() => {
  app.listen(port, () => {
    console.log(`[app]: berjalan pada: http://localhost:${port}`); //TODO di Log biar jelas udah jalan atau kagak
  });
});
