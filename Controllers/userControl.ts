const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

import type { Model } from "mongoose";
import { userModel } from "../models/user";

import type { Document } from "mongoose";

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
    password = await bcrypt.hash(btoa(password), 10);
    if (username === "") return this.#error[0];
    //untuk signup
    const isNameTaken = await this.#users.findOne({
      $or: [{ username: username }],
    });
    if (isNameTaken) return this.#error[0];
    const time = new Date().toLocaleDateString();

    const newUser: userType = {
      id:
        "txtr-usr" +
        username +
        Math.random().toString(16).slice(2) +
        "tme:" +
        time,
      name: name.replace(/<[^>]+>/g, ""),
      username: username.replace(/<[^>]+>/g, ""),
      desc: desc.replace(/<[^>]+>/g, ""),
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
      );
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

  async createAccessToken(id: string): Promise<string> {
    try {
      const user = await this.#users.findOne({ id });
      if (!user) return "";
      const newToken: string = jwt.sign(
        user.toObject(),
        process.env.JWT_SECRET_KEY || "",
        { expiresIn: "7d" }
      );
      return newToken;
    } catch (error) {
      console.error("Error creating access token:", error);
      return "";
    }
  }

  checkAccessToken(token: string) {
    let jwtSecretKey: string = process.env.JWT_SECRET_KEY || "";
    try {
      return jwt.verify(token, jwtSecretKey);
    } catch (error) {
      return null;
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
  }

  async checkFollow(username: string, myusername: string): Promise<boolean> {
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username });
    const mine: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username: myusername });

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
    };

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
  }
  async checkUserUname(
    username: string
  ): Promise<(Document<userType, any, any> & userType) | userType> {
    const user: (Document<userType, any, any> & userType) | null =
      await this.#users.findOne({ username: username });
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
  }
  async editProfile(
    userData: any,
    profilePicture: string
  ): Promise<userType | {}> {
    try {
      const user = await this.#users.findOne({ id: userData.id });
      if (userData.username === "") return this.#error[0];
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
}

export default Users;
