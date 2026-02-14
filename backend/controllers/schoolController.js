// import asyncHandler from "express-async-handler";
// import School from "../models/School.js";
// import {
//   uploadToCloudinary,
//   deleteFromCloudinary,
// } from "../config/cloudinary.js";


// // Create new school
// export const createSchool = asyncHandler(async (req, res) => {
//   const {
//     name,
//     city,
//     address,
//     contactPersonName,
//     mobile,
//     email,
//     trainersRequired,
//   } = req.body;

//   // Check if school already exists
//   const schoolExists = await School.findOne({ email });
//   if (schoolExists) {
//     res.status(400);
//     throw new Error("School with this email already exists");
//   }

//   let logoData = null;

//   // Upload logo if provided
//   if (req.body.logoBase64) {
//     try {
//       logoData = await uploadToCloudinary(req.body.logoBase64);
//     } catch (error) {
//       res.status(400);
//       throw new Error("Logo upload failed");
//     }
//   }

//   const school = await School.create({
//     name,
//     city,
//     address,
//     contactPersonName,
//     mobile,
//     email,
//     trainersRequired: trainersRequired || 1,
//     logo: logoData,
//     createdBy: req.user._id,
//     updatedBy: req.user._id,
//   });

//   const populatedSchool = await School.findById(school._id)

//   res.status(201).json({
//     success: true,
//     data: populatedSchool,
//   });
// });

// // Get all schools
// export const getSchools = asyncHandler(async (req, res) => {
//   const { status, city, search } = req.query;

//   let query = {};

//   if (status) query.status = status;
//   if (city) query.city = new RegExp(city, "i");
//   if (search) {
//     query.$or = [
//       { name: new RegExp(search, "i") },
//       { email: new RegExp(search, "i") },
//       { contactPersonName: new RegExp(search, "i") },
//     ];
//   }

//   const schools = await School.find(query)

//   // Add virtuals to response
//   const schoolsWithVirtuals = schools.map((school) => ({
//     ...school.toObject(),
//     trainersCount: school.currentTrainers.length,
//     trainerStatus: school.trainerStatus,
//     trainerRequirementStatus: {
//       required: school.trainersRequired,
//       current: school.currentTrainers.length,
//       needed: Math.max(
//         0,
//         school.trainersRequired - school.currentTrainers.length,
//       ),
//     },
//   }));

//   res.json({
//     success: true,
//     count: schools.length,
//     data: schoolsWithVirtuals,
//   });
// });

// // Get single school
// export const getSchool = asyncHandler(async (req, res) => {
//   const { id } = req.params
//   if (!id || id === "undefined") {
//     return res.status(400).json({
//       success: false,
//       message: "Id not found",
//     });
//   }
  
//   // ✅ Fix: Populate currentTrainers with employee details
//   const school = await School.findById(req.params?.id)
//     .populate({
//       path: 'currentTrainers',
//       populate: {
//         path: 'user',
//         select: 'basicInfo.fullName basicInfo.designation basicInfo.employeeId'
//       }
//     });

//   if (!school) {
//     return res.status(400).json({
//       success: false,
//       message: "School not found",
//     });
//   }

//   // Transform trainers data to include necessary fields
//   const trainers = school.currentTrainers.map(trainer => ({
//     _id: trainer._id,
//     basicInfo: {
//       fullName: trainer.user?.basicInfo?.fullName || trainer.basicInfo?.fullName || 'Unknown',
//       employeeId: trainer.basicInfo?.employeeId || 'N/A',
//       designation: trainer.user?.basicInfo?.designation || trainer.basicInfo?.designation || 'N/A',
//       employeeStatus: trainer.basicInfo?.employeeStatus || 'Active'
//     },
//     personalDetails: {
//       contactNumber: trainer.personalDetails?.contactNumber || 'N/A'
//     }
//   }));

//   const schoolData = {
//     ...school.toObject(),
//     currentTrainers: trainers, // ✅ Now contains populated trainer data
//     trainersCount: school.currentTrainers.length,
//     trainerStatus: school.trainerStatus,
//     trainerRequirementStatus: {
//       required: school.trainersRequired,
//       current: school.currentTrainers.length,
//       needed: Math.max(
//         0,
//         school.trainersRequired - school.currentTrainers.length,
//       ),
//     },
//   };

//   res.json({
//     success: true,
//     data: schoolData,
//   });
// });

// // Update school
// export const updateSchool = asyncHandler(async (req, res) => {
//   const school = await School.findById(req.params.id);

//   if (!school) {
//     return res.status(400).json({
//       success: false,
//       message: "School not found",
//     });
//   }

//   const { status } = req.body;

//   if (school.status === "active" && status === "inactive") {
//     // Check if school has active trainers
//     if (school.currentTrainers.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Cannot deactivate school with active trainers. Reassign trainers first.",
//       });
//     }
//   }

//   let logoData = school.logo;

//   // If new logo provided
//   if (req.body.logoBase64) {
//     // Delete old logo if exists
//     if (school.logo && school.logo.public_id) {
//       await deleteFromCloudinary(school.logo.public_id);
//     }

//     // Upload new logo
//     try {
//       logoData = await uploadToCloudinary(req.body.logoBase64);
//     } catch (error) {
//       return res.status(400).json({
//         success: false,
//         message: "Logo upload failed",
//       });
//     }
//   }

//   // Update school
//   const updatedSchool = await School.findByIdAndUpdate(
//     req.params.id,
//     {
//       ...req.body,
//       logo: logoData,
//       updatedBy: req.user._id,
//     },
//     { new: true, runValidators: true },
//   )
//     .populate("currentTrainers", "basicInfo.fullName basicInfo.employeeId")
//     .populate("createdBy", "name email")
//     .populate("updatedBy", "name email");

//   res.json({
//     success: true,
//     data: updatedSchool,
//   });
// });

// // Delete school
// export const deleteSchool = asyncHandler(async (req, res) => {
//   const school = await School.findById(req.params.id);

//   if (!school) {
//     return res.status(400).json({
//       success: false,
//       message: "School not found",
//     });
//   }

//   // Check if school has active trainers
//   if (school.currentTrainers.length > 0) {
//     return res.status(400).json({
//       success: false,
//       message: "Cannot delete school with active trainers. Reassign trainers first.",
//     });
//   }

//   // Delete logo from cloudinary
//   if (school.logo && school.logo.public_id) {
//     await deleteFromCloudinary(school.logo.public_id);
//   }

//   await school.deleteOne();

//   res.json({
//     success: true,
//     message: "School deleted successfully",
//   });
// });

// // Get school dashboard stats
// export const getSchoolStats = asyncHandler(async (req, res) => {
//   const totalSchools = await School.countDocuments();
//   const activeSchools = await School.countDocuments({ status: "active" });
//   const inactiveSchools = await School.countDocuments({ status: "inactive" });

//   const schools = await School.find({ status: "active" });

//   let totalTrainersRequired = 0;
//   let totalCurrentTrainers = 0;

//   schools.forEach((school) => {
//     totalTrainersRequired += school.trainersRequired;
//     totalCurrentTrainers += school.currentTrainers.length;
//   });

//   const shortage = Math.max(0, totalTrainersRequired - totalCurrentTrainers);

//   // Schools with critical shortage
//   const criticalSchools = schools.filter(
//     (school) => school.currentTrainers.length === 0,
//   ).length;

//   // Schools with adequate trainers
//   const adequateSchools = schools.filter(
//     (school) => school.currentTrainers.length >= school.trainersRequired,
//   ).length;

//   // Schools with shortage
//   const shortageSchools = schools.filter(
//     (school) =>
//       school.currentTrainers.length > 0 &&
//       school.currentTrainers.length < school.trainersRequired,
//   ).length;

//   res.json({
//     success: true,
//     data: {
//       totalSchools,
//       activeSchools,
//       inactiveSchools,
//       trainers: {
//         required: totalTrainersRequired,
//         current: totalCurrentTrainers,
//         shortage,
//         adequacy:
//           totalTrainersRequired > 0
//             ? Math.round((totalCurrentTrainers / totalTrainersRequired) * 100)
//             : 100,
//       },
//       schoolsStatus: {
//         critical: criticalSchools,
//         shortage: shortageSchools,
//         adequate: adequateSchools,
//       },
//     },
//   });
// });

// // Get school's trainers
// export const getSchoolTrainers = asyncHandler(async (req, res) => {

//   const { id } = req.params
//   if (!id || id === "undefined") {
//     return res.status(400).json({
//       success: false,
//       message: "Id not found",
//     });
//   }
//   const school = await School.findById(req.params?.id).populate({
//     path: "currentTrainers",
//     select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
//     populate: {
//       path: "user",
//       select: "name email",
//     },
//   });

//   if (!school) {
//     return res.status(400).json({
//       success: false,
//       message: "School not found",
//     });
//   }

//   res.json({
//     success: true,
//     data: {
//       school: {
//         _id: school._id,
//         name: school.name,
//         trainersRequired: school.trainersRequired,
//         currentCount: school.currentTrainers.length,
//         needed: Math.max(
//           0,
//           school.trainersRequired - school.currentTrainers.length,
//         ),
//       },
//       trainers: school.currentTrainers,
//     },
//   });
// });


import asyncHandler from "express-async-handler";
import School from "../models/School.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";



// Create new school
export const createSchool = asyncHandler(async (req, res) => {
  const {
    name,
    city,
    address,
    contactPersonName,
    mobile,
    email,
    trainersRequired,
  } = req.body;

  // Check if school already exists
  const schoolExists = await School.findOne({ email });
  if (schoolExists) {
    res.status(400);
    throw new Error("School with this email already exists");
  }

  let logoData = null;

  // Upload logo if provided
  if (req.body.logoBase64) {
    try {
      logoData = await uploadToCloudinary(req.body.logoBase64);
    } catch (error) {
      res.status(400);
      throw new Error("Logo upload failed");
    }
  }

  const school = await School.create({
    name,
    city,
    address,
    contactPersonName,
    mobile,
    email,
    trainersRequired: trainersRequired || 1,
    logo: logoData,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  const populatedSchool = await School.findById(school._id)
    .populate("currentTrainers", "basicInfo.fullName basicInfo.employeeId")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    success: true,
    data: populatedSchool,
  });
});

// Get all schools
export const getSchools = asyncHandler(async (req, res) => {
  const { status, city, search } = req.query;

  let query = {};

  if (status) query.status = status;
  if (city) query.city = new RegExp(city, "i");
  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { contactPersonName: new RegExp(search, "i") },
    ];
  }

  const schools = await School.find(query)
    .populate("currentTrainers", "basicInfo.fullName basicInfo.employeeId")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Add virtuals to response
  const schoolsWithVirtuals = schools.map((school) => ({
    ...school.toObject(),
    trainersCount: school.currentTrainers.length,
    trainerStatus: school.trainerStatus,
    trainerRequirementStatus: {
      required: school.trainersRequired,
      current: school.currentTrainers.length,
      needed: Math.max(
        0,
        school.trainersRequired - school.currentTrainers.length,
      ),
    },
  }));

  res.json({
    success: true,
    count: schools.length,
    data: schoolsWithVirtuals,
  });
});

// Get single school
export const getSchool = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!id || id === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Id not found",
    });
  }
  const school = await School.findById(req.params?.id)
    .populate({
      path: "currentTrainers",
      select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
      populate: {
        path: "user",
        select: "name email",
      },
    })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!school) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  const schoolData = {
    ...school.toObject(),
    trainersCount: school.currentTrainers.length,
    trainerStatus: school.trainerStatus,
    trainerRequirementStatus: {
      required: school.trainersRequired,
      current: school.currentTrainers.length,
      needed: Math.max(
        0,
        school.trainersRequired - school.currentTrainers.length,
      ),
    },
  };

  res.json({
    success: true,
    data: schoolData,
  });
});

// Update school
export const updateSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);

  if (!school) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  const { status } = req.body;

  if (school.status === "active" && status === "inactive") {
    // Check if school has active trainers
    if (school.currentTrainers.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot deactivate school with active trainers. Reassign trainers first.",
      });
    }
  }

  let logoData = school.logo;

  // If new logo provided
  if (req.body.logoBase64) {
    // Delete old logo if exists
    if (school.logo && school.logo.public_id) {
      await deleteFromCloudinary(school.logo.public_id);
    }

    // Upload new logo
    try {
      logoData = await uploadToCloudinary(req.body.logoBase64);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Logo upload failed",
      });
    }
  }

  // Update school
  const updatedSchool = await School.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      logo: logoData,
      updatedBy: req.user._id,
    },
    { new: true, runValidators: true },
  )
    .populate("currentTrainers", "basicInfo.fullName basicInfo.employeeId")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.json({
    success: true,
    data: updatedSchool,
  });
});

// Delete school
export const deleteSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);

  if (!school) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  // Check if school has active trainers
  if (school.currentTrainers.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete school with active trainers. Reassign trainers first.",
    });
  }

  // Delete logo from cloudinary
  if (school.logo && school.logo.public_id) {
    await deleteFromCloudinary(school.logo.public_id);
  }

  await school.deleteOne();

  res.json({
    success: true,
    message: "School deleted successfully",
  });
});

// Get school dashboard stats
export const getSchoolStats = asyncHandler(async (req, res) => {
  const totalSchools = await School.countDocuments();
  const activeSchools = await School.countDocuments({ status: "active" });
  const inactiveSchools = await School.countDocuments({ status: "inactive" });

  const schools = await School.find({ status: "active" });

  let totalTrainersRequired = 0;
  let totalCurrentTrainers = 0;

  schools.forEach((school) => {
    totalTrainersRequired += school.trainersRequired;
    totalCurrentTrainers += school.currentTrainers.length;
  });

  const shortage = Math.max(0, totalTrainersRequired - totalCurrentTrainers);

  // Schools with critical shortage
  const criticalSchools = schools.filter(
    (school) => school.currentTrainers.length === 0,
  ).length;

  // Schools with adequate trainers
  const adequateSchools = schools.filter(
    (school) => school.currentTrainers.length >= school.trainersRequired,
  ).length;

  // Schools with shortage
  const shortageSchools = schools.filter(
    (school) =>
      school.currentTrainers.length > 0 &&
      school.currentTrainers.length < school.trainersRequired,
  ).length;

  res.json({
    success: true,
    data: {
      totalSchools,
      activeSchools,
      inactiveSchools,
      trainers: {
        required: totalTrainersRequired,
        current: totalCurrentTrainers,
        shortage,
        adequacy:
          totalTrainersRequired > 0
            ? Math.round((totalCurrentTrainers / totalTrainersRequired) * 100)
            : 100,
      },
      schoolsStatus: {
        critical: criticalSchools,
        shortage: shortageSchools,
        adequate: adequateSchools,
      },
    },
  });
});

// Get school's trainers
export const getSchoolTrainers = asyncHandler(async (req, res) => {

  const { id } = req.params
  if (!id || id === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Id not found",
    });
  }
  const school = await School.findById(req.params?.id).populate({
    path: "currentTrainers",
    select: "basicInfo.fullName basicInfo.employeeId basicInfo.designation",
    populate: {
      path: "user",
      select: "name email",
    },
  });

  if (!school) {
    return res.status(400).json({
      success: false,
      message: "School not found",
    });
  }

  res.json({
    success: true,
    data: {
      school: {
        _id: school._id,
        name: school.name,
        trainersRequired: school.trainersRequired,
        currentCount: school.currentTrainers.length,
        needed: Math.max(
          0,
          school.trainersRequired - school.currentTrainers.length,
        ),
      },
      trainers: school.currentTrainers,
    },
  });
});
