import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { cleanupLocalFiles } from "../utils/fileCleanUp.js";
import {v2 as cloudinary} from "cloudinary";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Error in generating access and refresh token");
    }
}

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
    
    



});

const loginUser = asyncHandler(async (req, res, next) => {
    // get the data from frontend
    // username or email base login
    // check user existance
    // check for password match
    // generate access token and refresh token
    // send cookies
    // send response

    const {email,userName, password} = req.body 
    console.log(email);

    if(!(userName || email)){
        throw new ApiError(400, "Username or email is required to login");
    }

    const user = await User.findOne({
        $or: [{email}, {userName: userName?.toLowerCase()}]
    }) 
    
    if(!user){
        throw new ApiError(404, "User not found with this email or username");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Password is incorrect");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    if(!accessToken || !refreshToken){
        throw new ApiError(500, "Error in generating access and refresh token");
    }

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true, 
    }

    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User logged in successfully")
    );



});

const logoutUser = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, 
        {
            $set: { refreshToken: undefined }
        }, 
        {new: true})
        .select("-password -refreshToken"
        );

        const options = {
        httpOnly: true,
        secure: true, 
        }
    
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
        );

});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
    const incomingRefeshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefeshToken){
        throw new ApiError(401, "Unauthorized Access, refresh token is missing");
    }

    try {
        console.log("Incoming refresh token:", incomingRefeshToken);
        console.log("Refresh token secret:", process.env.REFRESH_TOKEN_SECRET);
        
        const decodedToken = jwt.verify(incomingRefeshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id)

    
        if(!user){
            throw new ApiError(401, "Unauthorized Access, user not found"); 
        }
    
        if(user?.refreshToken !== incomingRefeshToken){
            throw new ApiError(401, "Refresh token is expired or mismatched"); 
        }
    
        const {refreshToken: newrefreshToken,accessToken} = await generateAccessAndRefreshToken(user._id);
    
        const options = {
            httpOnly: true,
            secure: true, 
        }
    
        return res
        .status(200)
        .cookie("refreshToken", newrefreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, {accessToken, newrefreshToken}, "Access token refresh successfully")
        )

    } catch (error) {
        throw new ApiError(401, `Invalid refresh token: ${error.message}`);
    }
    
});


const changeCurrentPassword = asyncHandler(async (req, res, next) => {
    console.log("REQ BODY:", req.body);
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(404, "User not found");
    }
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid){
        throw new ApiError(401, "Old password is incorrect");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: true});
    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );

});


const getCurrentUser = asyncHandler(async (req, res, next) => {
    
    return res.status(200).json( new ApiResponse(200, req.user, "Current user fetched successfully"));

});


const updateAccountDetails = asyncHandler(async (req, res, next) => { 

    const { fullName } = req.body;
    if (!fullName?.trim()) {
        throw new ApiError(400, "Full name is required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { fullName: fullName?.trim() },
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
            new ApiResponse(200,updatedUser,"Account details updated successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res, next) => {
    const avatarLocalPath =  req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    const oldAvatarUrl = req.user?.avatar;
    console.log("Old Avatar URL:", oldAvatarUrl);

    const avatar = await uploadOnCloudinary(avatarLocalPath);


    if(!avatar){
        cleanupLocalFiles(req.file);
        throw new ApiError(500, "Error in uploading avatar on cloudinary");
    }

    const updatedUser = await User.findByIdAndUpdate(req.user?._id,
        { $set: {avatar: avatar.url}},
        {new: true}
    ).select("-password");

    // delete old avatar from cloudinary
    if (oldAvatarUrl) {
        const oldAvatarPublicId = oldAvatarUrl.split("/").pop().split(".")[0];
        cloudinary.uploader.destroy(oldAvatarPublicId, (err, result) => {
            if (err) console.error("Error deleting old avatar from Cloudinary:", err);
        });
    }


    return res
        .status(200)
        .json(
        new ApiResponse(200, updatedUser, "User avatar updated successfully")
        );
});


const updateUserCoverImage = asyncHandler(async (req, res, next) => {
    const coverImageLocalPath =  req.file?.path;


    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image is required");
    }

    const oldCoverImageUrl = req.user?.coverImage;

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage){
        cleanupLocalFiles(req.file);
        throw new ApiError(500, "Error in uploading cover Image on cloudinary");
    }

    const updatedUser = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {coverImage: coverImage.url}
        },
        {new: true}
    ).select("-password");

    if (oldCoverImageUrl) {
        const oldCoverPublicId = oldCoverImageUrl.split("/").pop().split(".")[0];
        cloudinary.uploader.destroy(oldCoverPublicId, (err, result) => {
            if (err) console.error("Error deleting old avatar from Cloudinary:", err);
        });
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedUser, "User cover Image updated successfully")
    );

});

export {registerUser, 
    loginUser,
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}; 