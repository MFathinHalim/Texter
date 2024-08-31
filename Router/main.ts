import { Router } from "express";
import type { Request, Response, Router as RouterTypes } from "express";
import Posts from "../Controllers/postControl";
import Users from "../Controllers/userControl";
import * as dotenv from "dotenv";
///////////////////////////////////////////////////////////////////////////
const multer = require("multer");
const ImageKit = require("imagekit");
const path = require("path");

///////////////////////////////////////////////////////////////////////////
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
        const user: string | undefined = req.query.user?.toString();
        if (user) {
          userClass.searchUser(search).then((users) => {
            return res.render("searchUser", { users, searchTerm: search });
          });
        }
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
router.route("/@:username/:id").get(async (req: Request, res: Response) => {
  try {
    const { username, id } = req.params;
    const search = req.query.search ? req.query.search.toString() : "";
    if (username === undefined) {
      return res.status(404).render("notfound", { searchTerm: "" });
    }
    // Fetch user details or other data related to username and id
    try {
      const userDetails = await userClass.checkUserUname(username);
      const data = await PostsClass.getData(id, 0, 0, search);
      if (data && userDetails.ban === false) {
        return res.render("details", {
          ...data,
          searchTerm: search,
        });
      } else {
        return res.status(404).render("notfound", { searchTerm: "" });
      }
    } catch (error) {
      console.error("Error fetching user or post data:", error);
      return res.status(500).send("Failed to fetch user or post data");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).send("Failed to fetch data");
  }
});
router.route("/post").post(upload.single("image"), async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    const checkToken = await userClass.checkAccessToken(token);
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
      //@ts-ignore: Unreachable code error
      const originalFileName = req.file.originalname;
      const ext = path.extname(originalFileName).toLowerCase();
      await imagekit.upload(
        {
          file: buffer,
          fileName: `image-${id}${ext}`,
          useUniqueFileName: false,
          folder: "Txtr",
        },
        async function (error: Error, result: any) {
          if (error) {
            console.error("Error uploading to ImageKit:", error);
            return res.status(500).json({ msg: "Terjadi kesalahan saat mengunggah file" });
          }

          img = result.url; // Save the uploaded image URL

          // Post data to PostsClass
          await PostsClass.posting(userData, checkToken, img)
            .then((post) => {
              userClass.createPostNotification(checkToken.id, post.id);
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
          userClass.createPostNotification(checkToken.id, post.id);
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
  const page: number = parseInt(req.query.page as string, 10) || 1; // Default ke halaman 1 jika tidak ada
  const limit = 5; // Get limit from query
  const search: string = req.query.search?.toString() || "";
  try {
    const posts = await PostsClass.getData("", page, limit, undefined, search); // Assuming getData now takes page and limit
    return res.json({ posts: posts, searchTerm: search }); // Send posts as JSON response
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});
router.route("/get/videos").get(async (req: Request, res: Response) => {
  const page: number = parseInt(req.query.page as string, 10) || 1; // Default ke halaman 1 jika tidak ada
  const limit = 5; // Get limit from query
  const search: string = req.query.search?.toString() || "";
  try {
    const posts = await PostsClass.getData("", page, limit, undefined, search, false, true); // Assuming getData now takes page and limit
    return res.json({ posts: posts, searchTerm: search }); // Send posts as JSON response
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});
router.route("/get/following").get(async (req: Request, res: Response) => {
  const page: number = parseInt(req.query.page as string, 10) || 1; // Default ke halaman 1 jika tidak ada
  const limit = 5; // Get limit from query
  const search: string = req.query.search?.toString() || "";
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  const checkToken = await userClass.checkAccessToken(token);
  try {
    const userFollowing = await userClass.checkWhatUserFollowing(checkToken.id);
    const posts = await PostsClass.getDataByFollowedUsers(userFollowing, page, limit); // Assuming getData now takes page and limit
    return res.json({ posts: posts, searchTerm: search }); // Send posts as JSON response
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});
router.route("/get/followers").get(async (req: Request, res: Response) => {
  const search: string = req.query.search?.toString() || "";
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  const checkToken = await userClass.checkAccessToken(token);
  try {
    const userFollowers = await userClass.getFollowersDetails(checkToken.id);
    return res.json({ users: userFollowers, searchTerm: search }); // Send posts as JSON response
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});
router.route("/get/replies/:id").get(async (req: Request, res: Response) => {
  const search: string = req.query.search?.toString() || "";
  const page: number = parseInt(req.query.page as string, 10) || 1; // Default ke halaman 1 jika tidak ada

  if (isNaN(page) || page < 1) {
    return res.status(400).json({ error: "Invalid page number" });
  }

  try {
    const { replies, totalPages } = await PostsClass.getReplies(req.params.id, page);

    return res.json({ replies, totalPages, searchTerm: search });
  } catch (error) {
    console.error("Error fetching replies:", error);
    return res.status(500).json({ error: "Failed to fetch replies" });
  }
});

router.route("/get/trends").get(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1; // Get page from query
  const limit = parseInt(req.query.limit as string) || 10; // Get limit from query
  const search: string = req.query.search?.toString() || "";
  try {
    const posts = await PostsClass.getData("", page, limit, undefined, search, true); // Assuming getData now takes page and limit
    return res.json({ posts: posts, searchTerm: search }); // Send posts as JSON response
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});
router.route("/get/top").get(async (req: Request, res: Response) => {
  try {
    const users = await userClass.getTopUsersByFollowers(); // Assuming getData now takes page and limit
    return res.json({ users: users }); // Send posts as JSON response
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});
router.route("/like/").post(async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  const checkToken = await userClass.checkAccessToken(token);
  let likes: number | postType = 0;
  if (checkToken) {
    const owner = await PostsClass.getOwner(req.body.id);
    let postId = req.body.id;
    if (postId.includes("txtr")) {
      const post: any = await PostsClass.getData(req.body.id, 0, 0, "");
      postId = post.post._id;
    }
    userClass.likePostNotification(checkToken.id, owner!.id, postId);
    likes = await PostsClass.liking(req.body.id, checkToken);
  }
  return res.json({
    likes: likes,
  });
});
router.route("/privacy").get((req: Request, res: Response) => {
  res.render("privacy-police", { searchTerm: "" }); // Render template notifications.ejs
});
router.route("/video").get((req: Request, res: Response) => {
  res.render("video", { searchTerm: "" }); // Render template notifications.ejs
});
router
  .route("/notification")
  .get((req: Request, res: Response) => {
    res.render("notifications", { searchTerm: "" }); // Render template notifications.ejs
  })
  .post(async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token == null) return res.sendStatus(401);

      const checkToken = await userClass.checkAccessToken(token);
      if (!checkToken) return res.sendStatus(401);

      // Ambil notifikasi
      const notifications = await userClass.getNotification(checkToken._id);

      // Kembalikan data notifikasi dalam format JSON
      return res.json({ notifications });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).send("Failed to fetch notifications");
    }
  });
router.route("/isLiked").get(async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);

    const checkToken = await userClass.checkAccessToken(token);
    if (!checkToken) return res.sendStatus(401);

    const postId = req.query.id?.toString();
    if (!postId) return res.status(400).send("Post ID is required");

    const isLiked = await PostsClass.isLike(postId, checkToken.id);

    return res.json({ isLiked });
  } catch (error) {
    console.error("Error checking post like status:", error);
    return res.status(500).send("Failed to check post like status");
  }
});

router.route("/get/bookmark/:id").get(async (req: Request, res: Response) => {
  const userId = req.params.id || "";
  const page = parseInt(req.query.page as string, 10) || 1; // Default ke halaman 1 jika tidak ada
  const limit = 5; // Jumlah item per halaman

  // Validasi halaman
  if (page < 1) {
    return res.status(400).json({ error: "Invalid page number" });
  }

  try {
    // Ambil bookmarks dengan paginasi
    const result = await userClass.getBookmarks(userId, page, limit);
    return res.json(result); // Kirim data sebagai respons
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

router
  .route("/bookmark/")
  .get(async (req: Request, res: Response) => {
    const user = await userClass.checkUserDetails(req.query.username?.toString() || "");
    if (user) {
      return res.render("bookmark", {
        user: user,
        searchTerm: "",
      });
    }
  })
  .post(async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    const checkToken = await userClass.checkAccessToken(token);
    if (checkToken) {
      await userClass.createBookmark(checkToken.id, req.body.id);
    }
    return res.sendStatus(200);
  });

router.route("/@:username").get(async (req: Request, res: Response) => {
  const user = await userClass.checkUserDetails(req.params.username, req.query.myname?.toString() || "");
  if (user) {
    return res.render("user", { user: user, searchTerm: "" });
  }
});
router.route("/get/user/post/:username").get(async (req: Request, res: Response) => {
  const user = await userClass.checkUserDetails(req.params.username, req.query.myname?.toString() || "");
  const page = parseInt(req.query.page as string, 10) || 1; // Default ke halaman 1 jika tidak ada

  // Validasi halaman
  if (page < 1) {
    return res.status(400).json({ error: "Invalid page number" });
  }
  const posts = await PostsClass.getData("", page, 5, user.user.id);
  return res.json({ posts: posts });
});
router.route("/search").get(async (req: Request, res: Response) => {
  return res.render("search", { searchTerm: "" });
});
router
  .route("/settings/:username")
  .get(async (req: Request, res: Response) => {
    const user = await userClass.checkUserDetails(req.params.username, req.query.myname?.toString() || "");
    if (user) {
      return res.render("edit-profile", { ...user, searchTerm: "" });
    }
  })
  .post(upload.single("image"), async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token == null) return res.sendStatus(401);
      const checkToken = await userClass.checkAccessToken(token);
      if (!checkToken) {
        return res.sendStatus(401);
      }

      let userData = JSON.parse(req.body.data);

      let img: string = ""; // Initialize image URL
      userData.id = checkToken.id;
      //@ts-ignore: Unreachable code error
      if (req.file) {
        // If a file is uploaded, process it
        //@ts-ignore: Unreachable code error
        const buffer = req.file.buffer;
        const id: string = checkToken.id;
        // Upload image to ImageKit
        await imagekit.upload(
          {
            file: buffer,
            fileName: `pfp-${id}.jpg`,
            useUniqueFileName: false,
            folder: "Txtr",
          },
          async function (error: Error, result: any) {
            if (error) {
              console.error("Error uploading to ImageKit:", error);
              return res.status(500).json({ msg: "Terjadi kesalahan saat mengunggah file" });
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

router.route("/post/report/").post(async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  const checkToken = await userClass.checkAccessToken(token);
  if (checkToken) PostsClass.report(req.query.id?.toString() || "");
  res.sendStatus(200);
});
router.route("/user/ban/").post(async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  const checkToken = await userClass.checkAccessToken(token);
  const isUserAdmin = await userClass.checkIsAdmin(checkToken.id);

  if (checkToken && isUserAdmin) {
    userClass.banUser(req.query.id?.toString() || "");
    return res.sendStatus(200);
  }
  return res.sendStatus(401);
});
router
  .route("/user/admin")
  .get(async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    const user = await userClass.checkAccessToken(token);
    const isUserAdmin = await userClass.checkIsAdmin(user.id);
    if (isUserAdmin) {
      return res.sendStatus(200);
    }
    return res.sendStatus(401);
  })
  .post(async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    const user = await userClass.checkAccessToken(token);
    const isUserAdmin = await userClass.checkIsAdmin(user.id);
    if (isUserAdmin) {
      await userClass.makeAdmin(req.query.id?.toString() || "");
      return res.sendStatus(200);
    }
  })
  .delete(async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    const user = await userClass.checkAccessToken(token);
    const isUserAdmin = await userClass.checkIsAdmin(user.id);
    if (isUserAdmin) {
      await userClass.removeAdmin(req.query.id?.toString() || "");
      res.sendStatus(200);
    }
    res.sendStatus(401);
  });
router
  .route("/dashboard/admin")
  .get(async (req: Request, res: Response) => {
    const isDashboardUser: boolean = req.query.user?.toString() === "true";
    const data = isDashboardUser ? await userClass.getAllUsers() : await PostsClass.getReportData();
    return res.render(isDashboardUser ? "dashboardUser" : "dashboard", {
      data: data,
      searchTerm: "",
    });
  })
  .post(async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    const user = await userClass.checkAccessToken(token);
    const isUserAdmin = await userClass.checkIsAdmin(user.id);
    if (isUserAdmin) {
      PostsClass.deleteReport(req.query.id?.toString() || "");
      res.sendStatus(200);
    }
    return res.sendStatus(401);
  })
  .delete(async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    const user = await userClass.checkAccessToken(token);
    const isUserAdmin = await userClass.checkIsAdmin(user.id);
    if (isUserAdmin) {
      PostsClass.deletePost(req.query.id?.toString() || "");
      res.sendStatus(200);
    }
    return res.sendStatus(401);
  });
router
  .route("/user/follow/:username")
  .get(async (req: Request, res: Response) => {
    const isFollowing: boolean | userType = await userClass.checkFollow(req.params.username, req.query.myname?.toString() || "");
    return res.json({ isFollowing });
  })
  .post(async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);
    const checkToken = await userClass.checkAccessToken(token);
    if (checkToken) {
      await userClass.follow(req.params.username, req.body.myname);
      const owner: userType = await userClass.getUserByUsername(req.params.username);
      await userClass.followPostNotification(checkToken.id, owner.id);
    }
    res.send(200);
  });

router.route("/user/check/").get(async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  const id = userClass.checkAccessToken(token).id;
  if (!id || id === "System") {
    return res.status(401);
  }
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
    let result: userType = await userClass.login(req.body.username.replace(" ", ""), req.body.password); //liat hasil resultnya nih

    if (result.username === "system") {
      //kalau sistem dia ke error
      return res.render("error", {
        type: "user",
        error: result,
        searchTerm: "",
      });
    }
    const tokenFunction = await userClass.createAccessToken(result.id.toString());
    const token = tokenFunction.newToken;
    res.cookie("refreshtoken", tokenFunction.refreshToken, {
      path: "/refresh",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30days
    });
    return res.render("redirect", {
      token: token,
      name: result.name,
      searchTerm: "",
    }); //kalau enggak langsung redirect
  });
router.route("/refresh").post(async (req: Request, res: Response) => {
  const { refreshtoken } = req.cookies;
  if (refreshtoken == null) return res.sendStatus(401);
  const accessToken: string = await userClass.createRefreshToken(refreshtoken);
  res.json({ accessToken });
});
router.route("/logout").post((req, res) => {
  res.clearCookie("refreshtoken", { path: "/refresh" });
  res.status(200).json({ message: "Logout successful" });
});
//? router signup
router
  .route("/signup") //signup
  .get((req: Request, res: Response) => {
    return res.render("signup", { searchTerm: "" }); //? ya render
  })
  .post(async (req: Request, res: Response) => {
    await userClass.signUp(req.body.name, req.body.username, req.body.password, req.body.desc); //di adain
    return res.redirect("/login"); //lalu ke /login
  });

export default router; //TODO export routernya buat dipake di index.ts
