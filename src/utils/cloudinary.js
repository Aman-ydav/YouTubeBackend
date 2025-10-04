import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

import dotenv from "dotenv";

dotenv.config({
    path: "./.env"
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;
        // upload to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })
        // file uploaded on cloudinary
        console.log("File uploaded on cloudinary", response.url); 
        return response;
    }
    catch(err){
        fs.unlinkSync(localFilePath);  // remove file from local uploads files as the upload failed
        console.log("Error in uploading on cloudinary", err);
        return null;
    }
}

export {uploadOnCloudinary};