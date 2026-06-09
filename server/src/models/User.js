// User model = database me ek user ka dhaancha (naam, email, password, role).
// Schema matlab "ek document me kaun-kaun se fields honge".
import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // password ko surakshit (hash) karne ke liye

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,    // do users ka same email nahi ho sakta
      lowercase: true, // hamesha chhote letters me save (Abc@x.com = abc@x.com)
      trim: true,
    },
    // Hum kabhi plain password save nahi karte — sirf uska hash rakhte hain.
    passwordHash: { type: String, required: true },
    // Chhota intro/tagline jo user apne profile pe likh sakta hai.
    bio: { type: String, default: "", trim: true, maxlength: 280 },
    // Profile photo ek chhote (resized) data URL ke roop me store hota hai.
    // File storage ki zaroorat nahi padti (free hosting ke liye ideal).
    avatar: { type: String, default: "" },
    role: {
      type: String,
      enum: ["user", "admin"], // sirf yeh do values allowed hain
      default: "user",
    },
  },
  { timestamps: true } // createdAt / updatedAt apne aap add ho jate hain
);

// Plain password ko hash me badalne ka helper.
userSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 10);
};

// Login ke time password check karne ke liye.
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// API response me kabhi passwordHash na jaye.
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    bio: this.bio || "",
    avatar: this.avatar || "",
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model("User", userSchema);
