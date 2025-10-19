import { Router } from "express";
import { registerUser, loginUser, logoutUser,refreshAccessToken,changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory} from "../Controllers/user.controller.js";
import { upload } from "../middlewares/multor.middleware.js";   
import {verifyJWT}  from '../middlewares/auth.middleware.js';
import { get } from "mongoose";

const router = Router();

router.route("/register").post(
    upload.fields([
        {name: "avatar", maxCount: 1},
        {name: "coverImage", maxCount: 1}
    ]),
    registerUser
);

router.route("/login").post(loginUser);


// secure route
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/update-avatar").patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
);

router.route("/update-cover-image").patch(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
);

router.route("/get-current-user").get(verifyJWT, getCurrentUser);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/update-account-details").patch(verifyJWT, updateAccountDetails);

router.route("/channel/:username").get(verifyJWT ,getUserChannelProfile);

router.route("/watch-history").get(verifyJWT, getWatchHistory);

export default router;