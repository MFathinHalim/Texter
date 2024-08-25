import { type Model, type Document } from "mongoose";
import { mainModel, reportModel } from "../models/post";
const { htmlToText } = require("html-to-text");
import * as dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();
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
//? Kelas untuk postingan
class Posts {
  static instance: Posts; //Instance

  //TODO Siapin variabel yang kita perlukan
  #posts: Model<postType>;
  #reports: Model<postType>;
  #notFound: postType;

  //* Constructor, semacam __init__ di python :3
  constructor() {
    this.#posts = mainModel; //Postnya untuk kelas
    this.#reports = reportModel;
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
  async getOwner(postId: string): Promise<userType | null> {
    try {
      // Cari postingan berdasarkan ID
      const post = await this.#posts
        .findOne({ id: postId })
        .populate("user", "-password")
        .populate("user", "-notification") // Populate user field tanpa password
        .exec();

      // Periksa apakah postingan ditemukan
      if (!post) {
        console.error("Post not found");
        return null;
      }

      // Kembalikan data pengguna dari postingan
      return post.user;
    } catch (error) {
      console.error("Error fetching post owner:", error);
      return null;
    }
  }
  //Fungsi untuk mendapatkan data
  async getData(
    id: string,
    page: number,
    limit: number,
    userId?: string,
    search?: string,
    trend?: boolean
  ): Promise<
    | { posts: postType[] }
    | { post: postType | null; replies?: postType[] }
    | { posts: string[] } // Type getData
  > {
    if (trend) {
      // Ambil semua post dari database
      let posts: any = await this.#posts.find().exec();

      // Populate fields
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

      // Fungsi untuk mengekstrak hashtag dari teks
      const extractHashtags = (text: string): string[] => {
        const hashtagPattern = /#(\w+)/g;
        const hashtags = new Set<string>();
        let match: RegExpExecArray | null;
        while ((match = hashtagPattern.exec(text)) !== null) {
          hashtags.add(match[1]); // tambahkan hashtag ke dalam set
        }
        return Array.from(hashtags);
      };

      // Kumpulkan semua hashtag dari semua judul post
      const allHashtags = new Set<string>();
      posts.forEach((post: postType) => {
        const hashtags = extractHashtags(post.title);
        hashtags.forEach((tag) => allHashtags.add(tag));
      });

      // Konversi set hashtag ke dalam array
      posts = Array.from(allHashtags);
      posts = shuffleArray(posts);
      return { posts };
    }

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
        let posts = await this.#posts.find({}).exec();
        posts = shuffleArray(posts);

        // Take only the necessary portion of shuffled posts
        posts = posts.filter((post) =>
          post.title.toLowerCase().includes(search?.toLowerCase() || "")
        );
        if (search?.trim().length === 0) {
          posts = posts.slice(skip, skip + adjustedLimit);
        }

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

        posts = posts.filter((post) => !post.user.ban && !post.replyTo);

        return { posts };
      } catch (error) {
        console.error("Error fetching posts:", error);
        return { posts: [] };
      }
    } else if (userId) {
      //? Jika dia user details
      const limit = 5;
      const skip = (page - 1) * limit;
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
        .limit(limit)
        .skip(skip)
        .sort({ $natural: -1 })
        .exec();
      posts = posts.filter((post) => post.user?.id === userId && !post.replyTo); //di filter yang sama dengan user
      return { posts };
    } else {
      //? Jika detail post
      try {
        const objectId = mongoose.Types.ObjectId.isValid(id)
          ? new mongoose.Types.ObjectId(id)
          : null;
        const post: postType | any = await this.#posts
          .findOne({ $or: [{ _id: objectId }, { id: id }] })
          .populate("user", "-password")
          .populate("user", "-notification")
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
        // Tambahkan informasi replyTo ke dalam post jika ada
        if (post.replyTo) {
          const replyToPost = await this.#posts
            .findOne({ id: post.replyTo })
            .populate("user", "-password")
            .populate("user", "-notification")
            .exec();

          post.replyTo = JSON.stringify(replyToPost) || null;
        }
        return { post: post || null };
      } catch (error) {
        console.error("Error fetching data:", error);
        return { post: null };
      }
    }
  }
  async getDataByFollowedUsers(followingUserIds: any, page = 1, limit = 10) {
    try {
      // Parameter paginasi
      const skip = (page - 1) * limit;

      // Query untuk mendapatkan posts dari pengguna yang di-follow
      let posts = await this.#posts
        .find({ user: { $in: followingUserIds } })
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
        .limit(limit)
        .skip(skip)
        .sort({ $natural: -1 }) // Mengurutkan berdasarkan waktu
        .exec();

      // Hitung total posts untuk menentukan total halaman
      const totalPosts = await this.#posts
        .countDocuments({
          user: { $in: followingUserIds },
        })
        .exec();
      const totalPages = Math.ceil(totalPosts / limit);

      // Filter posts jika diperlukan
      posts = posts.filter((post) => !post.user.ban && !post.replyTo);

      return { posts, totalPages };
    } catch (error) {
      console.error("Error fetching posts from followed users:", error);
      return { posts: [], totalPages: 0 };
    }
  }

  async getReplies(id: string, page: number) {
    // Validasi dan ambil post
    const objectId = mongoose.Types.ObjectId.isValid(id)
      ? new mongoose.Types.ObjectId(id)
      : null;
    const post: postType | any = await this.#posts
      .findOne({ $or: [{ _id: objectId }, { id: id }] })
      .populate("user", "-password")
      .populate("user", "-notification")
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

    // Jika post tidak ditemukan, kembalikan kosong
    if (!post) {
      return { replies: [], totalPages: 0 };
    }

    // Parameter paginasi
    const limit = 5;
    const skip = (page - 1) * limit;

    // Ambil replies dengan limit dan skip
    let replies: any = await this.#posts
      .find({ replyTo: post.id })
      .populate("user", "-password")
      .populate("user", "-notification")
      .limit(limit)
      .skip(skip)
      .exec();

    // Filter replies yang valid
    replies = replies.filter(
      (reply: postType | any) => reply.user !== undefined
    );

    // Hapus elemen yang tidak valid (opsional)
    const invalidReplyIds = replies
      .filter((reply: postType | any) => reply.user === undefined)
      .map((reply: postType | any) => reply._id);

    if (invalidReplyIds.length > 0) {
      await this.#posts.deleteMany({ _id: { $in: invalidReplyIds } });
    }

    // Hitung total replies untuk menentukan total halaman
    const totalReplies = await this.#posts
      .countDocuments({ replyTo: post.id })
      .exec();
    const totalPages = Math.ceil(totalReplies / limit);
    // Kembalikan hasil termasuk paginasi
    return { replies, totalPages };
  }

  async posting(post: postType, user: any, file: string): Promise<postType> {
    const time = new Date().toLocaleDateString(); // Dapatkan waktu saat ini

    // Trim the file (assuming file is a string) and check if it's empty
    const trimmedFile = file.trim();

    // Periksa apakah title dan file kosong
    const isTitleEmpty = !post.title || post.title.trim().length === 0;
    const isFileEmpty = trimmedFile.length === 0;

    // Jika title dan file kosong, kembalikan this.#notFound
    if (isTitleEmpty && isFileEmpty) {
      return this.#notFound;
    }

    if (post.reQuote) {
      // Kalau dia merupakan requote
      post.reQuote =
        (await this.#posts
          .findOne({ id: post.reQuote })
          .populate("like.users", "-password")
          .exec()) || undefined;
    }

    // Buat ID dan waktu post
    post.id = (
      Math.random().toString().replace("0.", "") + time.replace(/\//g, "")
    )
      .slice(0, 19)
      .padEnd(19, "0");
    post.time = time; // Buat ID nya dulu :D
    post.user = user._id; // Set user nya sesuai id (0o0)
    post.title = htmlToText(post.title);
    post.img = trimmedFile; // Set file
    // Proses repost dan requote jika diperlukan
    if (post.repost) {
      const og: (Document<postType, any, any> & postType) | null =
        await this.#posts.findOne({ id: post.ogId }); // Cari tahu original postnya jika dia merupakan repost
      post.img = og?.img;
    }

    // Cek jika post tidak ditemukan
    // (Anda bisa menambahkan logika pengecekan lebih lanjut di sini jika diperlukan)

    // Simpan post ke database
    await mainModel.create(post);
    return post;
  }

  async getReportData(): Promise<postType[] | { reports: string }> {
    try {
      // Fetch reported posts from the reportModel
      const reportedPosts = await this.#reports
        .find({})
        .populate("user", "-password")
        .populate("user", "-notification") // Populate user field if needed
        .populate("reQuote.user", "-password") // Populate reQuote user field if needed
        .populate("repost", "-password") // Populate repost field if needed
        .exec();

      if (reportedPosts.length === 0) {
        return { reports: "No reports found" };
      }
      return reportedPosts;
    } catch (error) {
      console.error("Error fetching report data:", error);
      return { reports: "Error fetching report data" };
    }
  }
  async report(postId: string): Promise<boolean> {
    // Validate input
    if (!postId) {
      throw new Error("Invalid input");
    }

    // Find the post by _id
    const post = await mainModel.findById(postId);
    if (!post) {
      throw new Error("Post not found");
    }
    const reportData = {
      _id: post._id,
      id: post.id,
      title: post.title,
      img: post.img,
      time: post.time,
      user: post.user,
      likes: post.like,
      reQuote: post.reQuote,
      replyTo: post.replyTo,
    };
    // Save the post data to the reportModel
    try {
      await reportModel.create(reportData);
      return true;
    } catch (error) {
      console.error("Error reporting post:", error);
      return false;
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    // Validate inputs
    if (!postId) {
      throw new Error("Invalid input: postId is required");
    }

    try {
      // Find and delete the post by _id
      await reportModel.findByIdAndDelete(postId);
      await mainModel.findByIdAndDelete(postId);

      return true;
    } catch (error) {
      console.error("Error deleting post:", error);
      return false;
    }
  }
  async deleteReport(postId: string): Promise<boolean> {
    // Validate inputs
    if (!postId) {
      throw new Error("Invalid input: postId is required");
    }

    try {
      // Find and delete the post by _id
      const result = await reportModel.findByIdAndDelete(postId);

      // Check if the post was found and deleted
      if (!result) {
        console.log("Post not found");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error deleting post:", error);
      return false;
    }
  }
  async isLike(postId: string, userId: string): Promise<boolean> {
    try {
      // Cari post berdasarkan ID
      const post = await this.#posts
        .findOne({ id: postId })
        .populate("like.users", "-password") // Populate user field
        .exec();

      if (!post) {
        console.error("Post not found");
        return false;
      }

      // Cek apakah pengguna sudah menyukai post tersebut
      return post.like.users.some(
        (user: userType) => user.id.toString() === userId
      );
    } catch (error) {
      console.error("Error checking like status:", error);
      return false;
    }
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
