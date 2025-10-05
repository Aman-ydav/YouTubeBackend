import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cleanupLocalFiles } from "../utils/fileCleanUp.js";

const registerUser = asyncHandler(async (req, res, next) => {

    //get user data form fronted
    //validation 
    //check user already exist
    //check for avatar,images
    // updload on cloudinary, avatar
    // create a user object
    // remove passwerd and refresh token from response
    // create entry in db
    // check for user creation 
    // send res
    
    const {fullName, email, userName, password} =req.body;
    console.log(fullName, email, userName, password);
    
    
    if([fullName, email, userName, password].some((field)=>!field?.trim() || !field)){
        cleanupLocalFiles(req.files);
        throw new ApiError(400,"All(*) fields are required");
    }

    
    const existedUser = await User.findOne({
        $or: [{email}, {userName}]
    })

    if(existedUser){
        cleanupLocalFiles(req.files);
        throw new ApiError(409, "User already exist with this email or username");
    }


    const avatarLocalPath =  req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    } else {
        coverImageLocalPath = null; // or handle the absence of cover image as needed
    }



    if(!avatarLocalPath){
        cleanupLocalFiles(req.files);
        throw new ApiError(400, "Avatar is required");
    }

    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!avatar){
        cleanupLocalFiles(req.files);
        throw new ApiError(500, "Error in uploading avatar on cloudinary");
    }
    
    
    const newuser = await User.create({
        fullName,
        email,
        userName: userName.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })
    
    
    const createdUser = await User.findById(newuser._id).select("-password -refreshToken");
    if(!createdUser){
        cleanupLocalFiles(req.files);
        throw new ApiError(500, "User not found while registration");
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser, "User registered successfully")
    );
    
    



})

export {registerUser};