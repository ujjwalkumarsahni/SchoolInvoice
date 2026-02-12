import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./OrderManagement/models/User.js";
import UserRole from "./OrderManagement/models/UserRole.js";

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

const seedAdmin = async () => {
  try {
    console.log("DB Connected");

    const existingAdmin = await User.findOne({ email: "admin@test.com" });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    const admin = await User.create({
      name: "Super Admin",
      email: "admin@test.com",
      passwordHash: "123456", // plain password (auto-hash hoga)
      role: "admin",
      isActive: true,
    });

    const userRole = await UserRole.create({
      user: admin._id,
      role: "admin",
      isActive: true,
    });

    console.log("✅ Admin created successfully");
    console.log("Email:", admin.email);
    console.log("Password: 123456");

    process.exit();
  } catch (error) {
    console.error("Seeder error:", error);
    process.exit(1);
  }
};

seedAdmin();
