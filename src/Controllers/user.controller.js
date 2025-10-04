import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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
    
    
    if([fullName, email, userName, password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"Full Name is required");
    }

    
    const existedUser = User.findOne({
        $or: [{email}, {userName}]
    })

    if(existedUser){
        throw new ApiError(409, "User already exist with this email or username");
    }


    const avatarLocalPath =  req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!avatar){
        throw new ApiError(500, "Error in uploading avatar on cloudinary");
    }
    
    
    const user = await User.create({
        fullName,
        email,
        userName: userName.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })
    
    
    const createdUser = await user.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "User not found while registration");
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser, "User registered successfully")
    );
    
    



})

export {registerUser};