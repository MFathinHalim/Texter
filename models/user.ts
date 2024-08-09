import { Model, Schema, model, Types } from "mongoose";

const userSchema: Schema<userType> = new Schema<userType>({
  id: String,
  name: String,
  username: String,
  desc: String,
  password: String,
  pp: String,
  ban: Boolean,
  isAdmin: Boolean,
  followers: [{ type: Types.ObjectId, ref: "user" }],
  following: [{ type: Types.ObjectId, ref: "user" }],
  bookmark: [{ type: Types.ObjectId, ref: "posts" }],
});

const userModel: Model<userType> = model("user", userSchema);
export { userModel, userSchema };
