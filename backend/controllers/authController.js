
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const login = async (req,res)=>{
  const {email,password}=req.body;

  const user=await User.findOne({email});
  if(!user) return res.status(404).json({msg:"User not found"});

  const ok=await user.comparePassword(password);
  if(!ok) return res.status(400).json({msg:"Wrong pass"});

  const token=jwt.sign(
    {id:user._id,role:user.role},
    "SECRET",
    {expiresIn:"7d"}
  );

  res.json({
    token,
    role:user.role,
    userId:user._id
  });
};
