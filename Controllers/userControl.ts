const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
////////////////////////////////////////////
import type { Model } from "mongoose";
import { userModel } from "../models/user";
import type { Document } from "mongoose";
///////////////////////////////////////////
dotenv.config();
class Users {
  static instances: Users;

  #users: Model<userType>;
  #error: userType[];

  constructor() {
    this.#users = userModel;
    this.#error = [
      {
        id: "System",
        name: "Username is Taken",
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
      {
        id: "System",
        name: "This User Not Found!",
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
    ]; //list kemungkinan error
  }

  static getInstances() {
    if (!Users.instances) Users.instances = new Users(); //Untuk ngestart class
    return Users.instances;
  }

  async signUp(
    name: string,
    username: string,
    password: string,
    desc: string
  ): Promise<userType> {
    password = await bcrypt.hash(btoa(password), 10); //bikin crypt buat passwordnya (biar gak diliat cihuyyy)
    const MAX_USERNAME_LENGTH = 16;

    // Regular expression to detect non-printable characters including Zero Width Space and other control characters
    const hasInvalidCharacters = /[\u200B-\u200D\uFEFF]/.test(username);

    // Regular expression to detect HTML tags
    const hasHTMLTags = /<\/?[a-z][\s\S]*>/i.test(username);

    // Check for invalid username
    if (
      username.trim().length === 0 ||
      hasInvalidCharacters ||
      hasHTMLTags ||
      username.trim().length > MAX_USERNAME_LENGTH ||
      name.trim().length > MAX_USERNAME_LENGTH
    ) {
      return this.#error[0]; // Handle username errors
    }
    //untuk signup
    const isNameTaken = await this.#users.findOne({
      $or: [{ username: username }],
    }); //? Check dulu apakah usernamenyna udah ada atau belum
    if (isNameTaken) return this.#error[0];
    ////////////////////////////////////////////////
    const time = new Date().toLocaleDateString(); //Bikin timenya
    const newUser: userType = {
      id:
        "txtr-usr" +
        username +
        Math.random().toString(16).slice(2) +
        "tme:" +
        time,
      name: name.replace(/<[^>]+>/g, ""), //! )
      username: username.replace(/<[^>]+>/g, ""), //! )====> Bikin supaya gak nambahin html <></> dan kawan kawan<(0O0)/
      desc: desc.replace(/<[^>]+>/g, ""), //! )
      password: password,
      pp: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      ban: false,
      followers: [],
      following: [],
    };

    this.#users.create(newUser); //di push

    return newUser; //di return
  }

  async login(username: string, password: string): Promise<userType | {}> {
    //Login
    try {
      const user = await this.#users.findOne({
        username: username.replace(/<[^>]+>/g, ""),
        ban: false,
      });
      if (!user) {
        return this.#error[1]; // User not found or banned
      }

      const isPasswordValid = await bcrypt.compare(
        btoa(password),
        user.password
      ); //? check apakah passwordnya sesuai
      if (!isPasswordValid) return this.#error[1]; // Invalid password

      return {
        username: user.username.replace(/<[^>]+>/g, ""),
        name: user.name.replace(/<[^>]+>/g, ""),
        id: user.id,
      };
    } catch (error) {
      console.error("Error during login:", error);
      return this.#error[1]; // Handle potential errors during database query
    }
  }

  async createAccessToken(
    id: string
  ): Promise<{ newToken: string; refreshToken: string }> {
    try {
      const user = await this.#users.findOne({ id });
      if (!user) return { newToken: "", refreshToken: "" };
      const newToken: string = jwt.sign(
        user.toObject(),
        process.env.JWT_SECRET_KEY || "",
        { expiresIn: "1d" }
      ); //Bikin access token
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
        }
      );

      return { newToken, refreshToken };
    } catch (error) {
      console.error("Error creating access token:", error);
      return { newToken: "", refreshToken: "" };
    }
  }

  createRefreshToken(refresh: string): Promise<string> {
    return jwt.verify(
      refresh,
      process.env.JWT_SECRET_KEY,
      async (err: Error, user: any) => {
        if (err) return "error";
        const createAccessToken = await this.createAccessToken(user.id);
        const accessToken: string = createAccessToken.newToken;

        return accessToken;
      }
    );
  }

  async createBookmark(id: string, postId: string) {
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ id });
    if (!user) {
      return this.#error[1];
    }
    const userAlreadyBookmark: userType | undefined = user.bookmark.find(
      (entry: any) => entry._id.toString() === postId
    );
    if (userAlreadyBookmark) {
      user.bookmark = user.bookmark.filter(
        (entry: any) => entry._id.toString() !== postId
      );
    } else {
      user.bookmark.push(postId);
    }
    return this.#users
      .updateOne({ id: id }, { $set: { bookmark: user.bookmark } })
      .then(() => 200);
  }
  async getBookmarks(id: string): Promise<{ posts?: any[] } | userType> {
    try {
      const user = await this.#users.findOne({ id }).populate({
        path: "bookmark",
        populate: {
          path: "user",
          select: "-password",
        },
      }); // Populasi jika bookmark merujuk ke postModel
      if (!user) {
        return this.#error[1];
      }
      return { posts: user.bookmark }; // Return the populated bookmarks
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      return this.#error[1];
    }
  }

  checkAccessToken(token: string) {
    let jwtSecretKey: string = process.env.JWT_SECRET_KEY || "";
    try {
      return jwt.verify(token, jwtSecretKey); //Check access token jwtnya sesuai atau kagak (?)
    } catch (error) {
      return this.#error[0];
    }
  }

  async checkIsAdmin(id: string): Promise<boolean | userType> {
    try {
      // Find the user by their ID
      const user: (Document<userType, any, any> & userType) | null =
        await this.#users.findOne({ id });

      // If user is not found, return the error message
      if (!user) {
        return this.#error[1];
      }
      // Check if the user is an admin
      if (user.isAdmin) {
        return true; // User is an admin
      } else {
        return false; // User is not an admin
      }
    } catch (error) {
      console.error("Error checking if user is admin:", error);
      return this.#error[1]; // Handle potential errors
    }
  }
  async makeAdmin(userId: string): Promise<boolean | string> {
    try {
      // Find the user by their ID
      const user: (Document<userType, any, any> & userType) | null =
        await this.#users.findOne({ id: userId });

      // If user is not found, return an error message
      if (!user) {
        return "User not found"; // Adjust the error message as needed
      }

      // Update the user's admin status
      user.isAdmin = true;
      await user.save();

      return true; // Successfully updated to admin
    } catch (error) {
      console.error("Error making user an admin:", error);
      return "Error updating admin status"; // Handle potential errors
    }
  }
  async banUser(userId: string): Promise<boolean | string> {
    try {
      // Find the user by their ID
      const user: (Document<userType, any, any> & userType) | null =
        await this.#users.findOne({ id: userId });

      // If user is not found, return an error message
      if (!user) {
        return "User not found"; // Adjust the error message as needed
      }

      // Update the user's ban status
      user.ban = true;
      await user.save();

      return true; // Successfully banned the user
    } catch (error) {
      console.error("Error banning user:", error);
      return "Error updating ban status"; // Handle potential errors
    }
  }
  async removeAdmin(userId: string): Promise<boolean | string> {
    try {
      // Find the user by their ID
      const user: (Document<userType, any, any> & userType) | null =
        await this.#users.findOne({ id: userId });

      // If user is not found, return an error message
      if (!user) {
        return "User not found"; // Adjust the error message as needed
      }

      // Update the user's admin status
      user.isAdmin = false;
      await user.save();

      return true; // Successfully removed admin status
    } catch (error) {
      console.error("Error removing admin status:", error);
      return "Error updating admin status"; // Handle potential errors
    }
  }

  async follow(
    username: string,
    myusername: string
  ): Promise<userType | number> {
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username });
    const mine: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username: myusername });

    if (user && mine) {
      // @ts-ignore: Unreachable code error
      const isFollowing = mine.following?.some((f) => f.equals(user._id));
      if (isFollowing) {
        await this.#users.findByIdAndUpdate(
          mine._id,
          { $pull: { following: user._id } },
          { new: true } // Return the updated document
        );
        await this.#users.findByIdAndUpdate(
          user._id,
          { $pull: { followers: mine._id } },
          { new: true }
        );
      } else {
        await this.#users.findByIdAndUpdate(
          mine._id,
          { $push: { following: user._id } },
          { new: true }
        );
        await this.#users.findByIdAndUpdate(
          user._id,
          { $push: { followers: mine._id } },
          { new: true }
        );
      }
      await user.save();
      await mine.save();
      return 200;
    } else {
      return this.#error[1];
    }
  } //sistem follow, sama kayak like :D

  async checkFollow(username: string, myusername: string): Promise<boolean> {
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username });
    const mine: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username: myusername });
    /* 
    ? check udah follow atau belum 
    ! (keperluan frontend)
    */
    if (user && mine) {
      // @ts-ignore: Unreachable code error
      const isFollowing = mine.following?.some((f) => f.equals(user._id));
      // @ts-ignore: Unreachable code error
      if (isFollowing) return true;
      return false;
    } else {
      // Handle cases where users are not found (optional)
      return false; // Or throw an error or log a message
    }
  }
  async checkUserDetails(username: string, myusername?: string) {
    let following: boolean = false;
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username: username });
    const userWithoutPassword = {
      ...user?.toObject(),
      password: undefined,
    }; //check user detail (gak ngasihi password)

    if (myusername) {
      const mine: (Document<userType, any, any> & userType) | null =
        await this.#users.findOne({ username: myusername });
      if (user && mine && user.followers && mine.following) {
        const isFollowing = mine.following.some(
          // @ts-ignore: Unreachable code error
          (f) => f.username === user.username
        );
        if (isFollowing) following = true;

        return {
          user: userWithoutPassword,
          following: following,
        };
      }
    }
    if (user) {
      return {
        user: userWithoutPassword,
      };
    }
    return {
      user: this.#error[1],
      following: following,
    };
  }

  async checkUserId(
    userId: string
  ): Promise<(Document<userType, any, any> & userType) | userType> {
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ id: userId });
    if (user) {
      return user;
    } else {
      return this.#error[1];
    }
  } //cari usernya berdasarkan id

  async checkUserUname(
    username: string
  ): Promise<(Document<userType, any, any> & userType) | userType> {
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username: username }); //cari berdasarkan username
    if (user) {
      return user;
    } else {
      return this.#error[1];
    }
  }

  async checkIsUserBan(
    id: string
  ): Promise<(Document<userType, any, any> & userType) | userType> {
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ id: id });
    if (user) {
      return user;
    } else {
      return this.#error[1];
    }
  } //! Check di ban atau kagak nihhhh
  async getTopUsersByFollowers(limit: number = 5): Promise<userType[]> {
    try {
      // Ambil semua pengguna yang tidak dibanned
      const users: (Document<userType, any, any> & userType)[] =
        await this.#users.find({
          ban: false,
        });

      // Urutkan pengguna berdasarkan jumlah followers secara menurun
      const sortedUsers = users.sort(
        (a, b) => b.followers.length - a.followers.length
      );

      // Ambil 5 pengguna teratas dari hasil urutan
      const topUsers = sortedUsers.slice(0, limit);

      // Hilangkan password dari data pengguna yang dikembalikan
      const result = topUsers.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        pp: user.pp,
        desc: user.desc,
        followersCount: user.followers.length,
      }));

      return result;
    } catch (error) {
      console.error("Error getting top users by followers:", error);
      return []; // Kembalikan array kosong jika terjadi kesalahan
    }
  }
  async editProfile(
    userData: any,
    profilePicture: string
  ): Promise<userType | {}> {
    try {
      const user = await this.#users.findOne({ id: userData.id });
      const hasInvalidCharacters =
        /[\u200B-\u200D\uFEFF]/.test(userData.username) ||
        /[\u200B-\u200D\uFEFF]/.test(userData.name);

      // Regular expression to detect HTML tags
      const hasHTMLTags =
        /<\/?[a-z][\s\S]*>/i.test(userData.username) ||
        /<\/?[a-z][\s\S]*>/i.test(userData.name);

      // Maximum length for Discord username
      const MAX_DISCORD_USERNAME_LENGTH = 16;

      // Check for invalid fields
      if (
        userData.username.trim().length === 0 ||
        userData.name.trim().length === 0 ||
        hasInvalidCharacters ||
        hasHTMLTags ||
        userData.username.trim().length > MAX_DISCORD_USERNAME_LENGTH ||
        userData.name.trim().length > MAX_DISCORD_USERNAME_LENGTH
      ) {
        return this.#error[0];
      }
      if (!user) {
        return this.#error[1]; // User not found
      }

      user.name = userData.name;
      user.pp = profilePicture !== "" ? profilePicture : user.pp;
      user.desc = userData.desc;

      await user.save();
      return {
        username: user.username.replace(/<[^>]+>/g, ""),
        name: user.name.replace(/<[^>]+>/g, ""),
        pp: user.pp,
        desc: user.desc.replace(/<[^>]+>/g, ""),
      };
    } catch (error) {
      console.error("Error editing profile:", error);
      return this.#error[1];
    }
  }
  async getAllUsers(): Promise<
    (userType & { password?: never; following?: never; followers?: never })[]
  > {
    try {
      const users: (Document<userType, any, any> & userType)[] =
        await this.#users.find();
      return users.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        pp: user.pp,
        desc: user.desc,
        ban: user.ban,
        isAdmin: user.isAdmin,
      }));
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }
}

export default Users; //TODO Export biar bisa dipake
