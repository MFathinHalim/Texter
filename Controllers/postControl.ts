import { type Model, type Document } from "mongoose";
import mainModel from "../models/post";
const { htmlToText } = require("html-to-text");
import * as dotenv from "dotenv";

dotenv.config();

//? Kelas untuk postingan
class Posts {
  static instance: Posts; //Instance

  //TODO Siapin variabel yang kita perlukan
  #posts: Model<postType>;
  #notFound: postType;

  //* Constructor, semacam __init__ di python :3
  constructor() {
    this.#posts = mainModel; //Postnya untuk kelas
    this.#notFound = {
      id: "not-found",
      title: "data not found",
      time: "undefined",
      user: {
        id: "System",
        name: "System",
        username: "system",
        desc: "system",
        password: "system",
        pp: "",
        ban: false,
        accessToken: {
          accessNow: "",
          timeBefore: "",
        },
      },
      replyTo: "",
      like: {
        total: 0,
        users: [],
      },
    }; //Post kalau gak ketemu
  }

  //Dapatin instancenya, alias cek udah ada atau belum :D
  static getInstances(): Posts {
    if (!Posts.instance) Posts.instance = new Posts(); //? Bikin kelasnya
    return Posts.instance; //return instancenya (alias kelasnya)
  }

  //Fungsi untuk mendapatkan data
  async getData(
    id: string,
    page: number,
    limit: number,
    userId?: string,
    search?: string
  ): Promise<
    { posts: postType[] } | { post: postType | null; replies?: postType[] } // Type getData
  > {
    if (!id && userId === undefined) {
      //? jika dia homepage saja
      try {
        const totalPosts = await this.#posts.countDocuments(); // Get total number of posts
        const skip = limit;

        // Adjust limit if on the last page to avoid fetching more than available
        let adjustedLimit = Math.min(limit, totalPosts - skip);
        if (adjustedLimit <= 0) {
          adjustedLimit = 1;
        }

        // Query posts and shuffle the results
        let posts = await this.#posts
          .find({ title: { $regex: search, $options: "i" } })
          .exec();
        posts = shuffleArray(posts);

        // Take only the necessary portion of shuffled posts
        posts = posts.slice(skip, skip + adjustedLimit);

        // Populate user and reQuote after shuffling and slicing
        await this.#posts.populate(posts, {
          path: "user",
          select: "-password",
        });
        await this.#posts.populate(posts, {
          path: "reQuote",
          populate: {
            path: "user",
            select: "-password",
          },
        });
        await this.#posts.populate(posts, {
          path: "repost",
          select: "-password",
        });

        return { posts };
      } catch (error) {
        console.error("Error fetching posts:", error);
        return { posts: [] };
      }

      //function untuk shuffle array
      function shuffleArray(array: any[]) {
        let currentIndex = array.length,
          temporaryValue,
          randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
          // Pick a remaining element...
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;

          // And swap it with the current element.
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }

        return array;
      }
    } else if (userId) {
      //? Jika dia user details
      let posts = await this.#posts
        .find({})
        .populate({
          path: "user",
          select: "-password",
        })
        .populate({
          path: "reQuote",
          populate: {
            path: "user",
            select: "-password",
          },
        })
        .populate({
          path: "repost",
          select: "-password",
        })
        .exec();
      posts = posts.filter((post) => post.user?.id === userId); //di filter yang sama dengan user
      return { posts };
    } else {
      //? Jika detail post
      try {
        const post = await this.#posts
          .findOne({ id })
          .populate("user", "-password")
          .populate({
            path: "reQuote",
            populate: {
              path: "user",
              select: "-password",
            },
          })
          .populate({
            path: "repost",
            select: "-password",
          })
          .exec();
        const replies = await this.#posts
          .find({ replyTo: id })
          .populate("user", "-password")
          .exec();
        return { post: post || null, replies: replies || [] };
      } catch (error) {
        console.error("Error fetching data:", error);
        return { post: null, replies: [] };
      }
    }
  }

  async posting(post: postType, user: any, file: string): Promise<postType> {
    const time = new Date().toLocaleDateString(); //dapatkan waktu saat ini

    if (!post.title || post.title.trim().length === 0) return this.#notFound; // kalau gak ketemu
    if (post.repost) {
      const og: (Document<postType, any, any> & postType) | null =
        await this.#posts.findOne({ post }); // cari tahu original postnya jika dia merupakan repost
      post.ogId = og?.id; // kasih ogId nya
    }
    if (post.reQuote) {
      // Kalau dia merupakan requote
      post.reQuote =
        (await this.#posts
          .findOne({ id: post.reQuote })
          .populate("like.users", "-password")
          .exec()) || undefined;
    }
    (post.id = "txtr" + Math.random().toString(16).slice(2) + "tme:" + time),
      (post.time = time); //bikin idnya dulu :D
    post.user = user._id; //set usernya sesuai id (0o0)
    post.title = htmlToText(post.title);
    if (post.title === "" || post.title === undefined || post.title === null) {
      return this.#notFound; //kalau kosong semuanya //!(parah sih isengnya :D)
    }
    post.img = file;
    await mainModel.create(post);
    return post;
  }
  liking(postId: string, user: any): Promise<number> {
    //Fungsi ngelike
    return this.#posts
      .findOne({ id: postId })
      .populate("like.users", "-password") //intinya nyari dulu
      .exec()
      .then((post: any) => {
        if (!post) {
          throw new Error("Post not found");
        }

        const userAlreadyLike: userType | undefined = post.like.users.find(
          (entry: userType) => entry.id.toString() === user.id
        ); //kalau usernya udah ngelike

        if (!userAlreadyLike) {
          // User belum like, tambahkan like
          post.like.users.push(user._id); //? bakal di push
        } else {
          // User sudah like, hapus like
          post.like.users = post.like.users.filter(
            (entry: userType) => entry.id.toString() !== user.id
          ); //? di filter
        }

        //! Update post di database
        return this.#posts
          .updateOne(
            { id: postId },
            { $set: { "like.users": post.like.users } }
          )
          .then(() => post.like.users.length);
      })
      .catch((error: any) => {
        console.error("Error in liking:", error);
        return this.#notFound;
      });
  }
}
export default Posts; //TODO Di Export supaya dipake di files lain :D
