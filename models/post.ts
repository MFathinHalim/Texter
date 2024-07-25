import { Model, Schema, Types, model } from "mongoose";

// Main post schema
const postSchema = new Schema<postType>({
    id: String,
    title: String,
    time: String,
    user: { type: Types.ObjectId, ref: 'user' },
    like: {
      total: Number,
      users: [{ type: Types.ObjectId, ref: 'user', default: undefined }],
    },
    replyTo: String,
    img: String,
    repost: { type: Types.ObjectId, ref: 'user', default: undefined },
    ogId: String,
    reQuote: { type: Types.ObjectId, ref: 'posts', default: undefined } // Embed the separate schema
});

const mainModel:Model<postType> = model<postType>("posts", postSchema);
export default mainModel;
