import { Router } from "express";
import type { Request, Response, Router as RouterTypes } from "express";

import Posts from "../Controllers/postControl";
import Users from "../Controllers/userControl";
import * as dotenv from "dotenv";

const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const ImageKit = require("imagekit");

dotenv.config();

const imagekit = new ImageKit({
  publicKey: process.env.publicImg,
  privateKey: process.env.privateImg,
  urlEndpoint: process.env.urlEndPoint,
});

const userClass: Users = Users.getInstances(); //Cek classnya
const PostsClass: Posts = Posts.getInstances(); //Cek classnya
const router: RouterTypes = Router(); //Bikin Router Baru

router
  .route("/") // Route /
  .get(async (req: Request, res: Response) => {
    try {
      try {
        const id = req.query.id ? req.query.id.toString() : "";
        const search = req.query.search ? req.query.search.toString() : "";

        PostsClass.getData(id, 0, 0, search)
          .then((data) => {
            if (data) {
              // Render halaman yang sesuai dengan data
              return res.render(id ? "details" : "homepage", {
                ...data,
                searchTerm: search,
              });
            } else {
              // Handle case where data is not found or undefined
              return res.render("homepage", { searchTerm: search }); // Render homepage with empty data
            }
          })
          .catch((error) => {
            // Tangani error jika terjadi selama proses
            console.error("Error fetching data:", error);
            return res.render("homepage", {}); // Render homepage dengan data kosong sebagai fallback
          });
      } catch (error) {
        // Handle error if getData function throws an error
        console.error("Error fetching data:", error);
        return res.status(500).send("Error fetching data");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      return res.status(500).send("Failed to fetch data");
    }
  });
router
  .route("/post")
  .post(upload.single("image"), async (req: Request, res: Response) => {
    try {
      const checkToken = await userClass.checkAccessToken(req.body.token);
      if (!checkToken) {
        throw new Error("Invalid token");
      }

      const userData = JSON.parse(req.body.data);

      let img: string = ""; // Initialize image URL
      //@ts-ignore: Unreachable code error
      if (req.file) {
        // If a file is uploaded, process it
        //@ts-ignore: Unreachable code error
        const buffer = req.file.buffer;
        const time = new Date().toLocaleDateString();

        const id = `${userData.title}-texter-${time}`;
        // Upload image to ImageKit

        await imagekit.upload(
          {
            file: buffer,
            fileName: `image-${id}.jpg`,
            useUniqueFileName: false,
            folder: "Txtr",
          },
          async function (error: any, result: any) {
            if (error) {
              console.error("Error uploading to ImageKit:", error);
              return res
                .status(500)
                .json({ msg: "Terjadi kesalahan saat mengunggah file" });
            }

            img = result.url; // Save the uploaded image URL

            // Post data to PostsClass
            await PostsClass.posting(userData, checkToken, img)
              .then((post) => {
                res.json(post);
              })
              .catch((error) => {
                // Tangani error jika diperlukan
                console.error("Error posting:", error);
                // Atau tampilkan pesan error
                res.status(500).send("Error posting");
              });
          }
        );
      } else {
        // Post data to PostsClass
        await PostsClass.posting(userData, checkToken, img)
          .then((post) => {
            res.json(post);
          })
          .catch((error) => {
            // Tangani error jika diperlukan
            console.error("Error posting:", error);
            // Atau tampilkan pesan error
            res.status(500).send("Error posting");
          });
      }
    } catch (error) {
      console.error("Error posting data:", error);
      return res.status(500).send("Failed to post data");
    }
  });

router.route("/get/posts").get(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1; // Get page from query
  const limit = parseInt(req.query.limit as string) || 10; // Get limit from query
  const search: string = req.query.search?.toString() || "";
  try {
    const posts = await PostsClass.getData("", page, limit, undefined, search); // Assuming getData now takes page and limit
    return res.json({ posts: posts, searchTerm: search }); // Send posts as JSON response
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.route("/like/").post(async (req: Request, res: Response) => {
  const checkToken: boolean = await userClass.checkAccessToken(req.body.token);
  let likes: number | postType = 0;
  if (checkToken) {
    likes = await PostsClass.liking(req.body.id, checkToken);
  }
  return res.json({
    likes: likes,
  });
});

router
  .route("/user/details/:username")
  .get(async (req: Request, res: Response) => {
    const user = await userClass.checkUserDetails(
      req.params.username,
      req.query.myname?.toString() || ""
    );
    const post = await PostsClass.getData("", 0, 0, user.user.id);
    if (user && post) {
      return res.render("user", { user: user, posts: post, searchTerm: "" });
    }
  });

router
  .route("/profile/:username")
  .get(async (req: Request, res: Response) => {
    const user = await userClass.checkUserDetails(
      req.params.username,
      req.query.myname?.toString() || ""
    );
    if (user) {
      return res.render("edit-profile", { ...user, searchTerm: "" });
    }
  })
  .post(upload.single("image"), async (req: Request, res: Response) => {
    try {
      const checkToken: boolean = await userClass.checkAccessToken(
        req.body.token
      );
      if (!checkToken) {
        throw new Error("Invalid token");
      }

      const userData = JSON.parse(req.body.data);

      let img: string = ""; // Initialize image URL
      //@ts-ignore: Unreachable code error
      if (req.file) {
        // If a file is uploaded, process it
        //@ts-ignore: Unreachable code error
        const buffer = req.file.buffer;
        const id: string = userData.id;
        // Upload image to ImageKit

        await imagekit.upload(
          {
            file: buffer,
            fileName: `pfp-${id}.jpg`,
            useUniqueFileName: false,
            folder: "Txtr",
          },
          async function (error: any, result: any) {
            if (error) {
              console.error("Error uploading to ImageKit:", error);
              return res
                .status(500)
                .json({ msg: "Terjadi kesalahan saat mengunggah file" });
            }
            const currentEpochTime = Date.now();
            const updatedAt = `updatedAt=${currentEpochTime}`;
            img = result.url + `?updatedAt=${updatedAt}`; // Save the uploaded image URL
            await userClass.editProfile(userData, img);
            return res.send(200);
          }
        );
      }
      // Post data to PostsClass
      await userClass.editProfile(userData, img);
      return res.send(200);
    } catch (error) {
      console.error("Error posting data:", error);
      return res.status(500).send("Failed to post data");
    }
  });

router
  .route("/user/details/json/:username")
  .get(async (req: Request, res: Response) => {
    const user = await userClass.checkUserDetails(
      req.params.username,
      req.params.username
    );
    return res.json({ user: user });
  });

router
  .route("/user/follow/:username")
  .get(async (req: Request, res: Response) => {
    const isFollowing: boolean | userType = await userClass.checkFollow(
      req.params.username,
      req.query.myname?.toString() || ""
    );
    return res.json({ isFollowing });
  })
  .post(async (req: Request, res: Response) => {
    const checkToken: boolean = await userClass.checkAccessToken(
      req.body.token
    );
    if (checkToken)
      await userClass.follow(req.params.username, req.body.myname);
    res.send(200);
  });

router.route("/user/check").get(async (req: Request, res: Response) => {
  const id = userClass.checkAccessToken(req.query.id?.toString() || "").id;
  const checkUser = await userClass.checkIsUserBan(id);
  return res.json({
    check: checkUser.ban,
    user: checkUser,
  });
});

//? router login
router
  .route("/login")
  .get((req: Request, res: Response) => {
    return res.render("login", { searchTerm: "" });
  }) //untuk get login, ya di render aja
  .post(async (req: Request, res: Response) => {
    let result: any = await userClass.login(
      req.body.username.replace(" ", ""),
      req.body.password
    ); //liat hasil resultnya nih

    if (result.username === "system") {
      //kalau sistem dia ke error
      return res.render("error", {
        type: "user",
        error: result,
        searchTerm: "",
      });
    }
    const token = await userClass.createAccessToken(result.id.toString());
    return res.render("redirect", {
      token: token,
      name: result.name,
      searchTerm: "",
    }); //kalau enggak langsung redirect
  });

//? router signup
router
  .route("/signup") //signup
  .get((req: Request, res: Response) => {
    return res.render("signup", { searchTerm: "" }); //? ya render
  })
  .post(async (req: Request, res: Response) => {
    await userClass.signUp(
      req.body.name,
      req.body.username,
      req.body.password,
      req.body.desc
    ); //di adain
    return res.redirect("/login"); //lalu ke /login
  });

export default router; //TODO export routernya buat dipake di index.ts
