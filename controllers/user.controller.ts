require('dotenv').config();
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { accessTokenExpire, accessTokenOptions, refreshTokenExpire, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.service";
import cloudinary from "cloudinary";
import CourseModel from "../models/course.model";
import mongoose from "mongoose";

// register user
interface IRegistrationBody {
    name: string;
    email: string;
    password: string;
    avatar?: string;
}

export const registrationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;

        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler("Email already exist", 400));
        };

        const user: IRegistrationBody = {
            name,
            email,
            password,
        };

        const activationToken = createActivationToken(user);

        const activationCode = activationToken.activationCode;

        const data = { user: { name: user.name }, activationCode };

        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data);

        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                template: "activation-mail.ejs",
                data,
            });

            res.status(201).json({
                success: true,
                message: `Activation code sent to your email: ${user.email}`,
                activationToken: activationToken.token,
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
});

interface IActivationToken {
    token: string;
    activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({
        user, activationCode
    }, process.env.ACTIVATION_SECRET as Secret, {
        expiresIn: "5m",
    });

    return { token, activationCode };
}

//activate user
interface IActivationRequest {
    activation_token: string;
    activation_code: string;
}

export const activateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code } = req.body as IActivationRequest;
        const newUser: { user: IUser; activationCode: string } = jwt.verify(
            activation_token,
            process.env.ACTIVATION_SECRET as string
        ) as { user: IUser; activationCode: string };

        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler("Invalid activation code", 400));
        }

        const { name, email, password } = newUser.user;

        const existUser = await userModel.findOne({ email });

        if (existUser) {
            return next(new ErrorHandler("Email already exist", 400));
        }
        const user = await userModel.create({
            name,
            email,
            password,
        });
        res.status(201).json({
            success: true,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
});

//login user
interface ILoginRequest {
    email: string;
    password: string;
}

export const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ILoginRequest;

        if (!email || !password) {
            return next(new ErrorHandler("Please enter email and password", 400));
        };

        const user = await userModel.findOne({ email }).select("+password");

        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 400));
        };

        const isPasswordMatched = await user.comparePassword(password);

        if (!isPasswordMatched) {
            return next(new ErrorHandler("Invalid email or password", 400));
        };

        sendToken(user, 200, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

//logout user
export const logoutUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 });
        res.cookie("refresh_token", "", { maxAge: 1 });

        const userId = req.user?._id || "";

        redis.del(userId);
        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

//update access token
export async function updateAccessToken(req: Request, res: Response, next: NextFunction) {
    const refreshToken = req.cookies.refresh_token as string;
    if (!refreshToken) {
        return next(new ErrorHandler("No refresh token available, please login again.", 401));
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN as string) as JwtPayload;
        const userId = decoded.id;
        const user = await redis.get(userId);

        if (!user) {
            throw new ErrorHandler("User not found, please login again.", 401);
        }

        // Generate new access token
        const newAccessToken = jwt.sign({ id: userId }, process.env.ACCESS_TOKEN as string, { expiresIn: '1h' });
        res.cookie('access_token', newAccessToken, { httpOnly: true, sameSite: 'strict' });

        req.user = JSON.parse(user);
        next();
    } catch (error) {
        next(new ErrorHandler("Failed to refresh access token.", 401));
    }
}

//get user info
export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        getUserById(userId, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

interface ISocialAuthBody {
    email: string;
    name: string;
    avatar: string;
}

//social auth
export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, avatar } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) {
            const newUser = await userModel.create({
                name,
                email,
                avatar,
            });
            sendToken(newUser, 200, res);
        }
        else {
            sendToken(user, 200, res);
        }
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

//update user info
interface IUpdateUserInfo {
    name?: string;
    email?: string
}

export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.body as IUpdateUserInfo;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (name && user) {
            user.name = name;
        }

        await user?.save();

        await redis.set(userId, JSON.stringify(user));

        res.status(201).json({
            success: true,
            user,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

//update user password
interface IUpdateUserPassword {
    oldPassword: string;
    newPassword: string;
}

export const updatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { oldPassword, newPassword } = req.body as IUpdateUserPassword;

        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler("Please enter old and new password", 400));
        }

        const user = await userModel.findById(req.user?._id).select("+password");

        if (user?.password === undefined) {
            return next(new ErrorHandler("Invalid user", 400));
        }

        const isPasswordMatched = await user?.comparePassword(oldPassword);

        if (!isPasswordMatched) {
            return next(new ErrorHandler("Old password is incorrect", 400));
        }

        user.password = newPassword;

        await user.save();

        await redis.set(req.user?._id, JSON.stringify(user));

        res.status(201).json({
            success: true,
            user,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

interface IUpdateProfilePicture {
    avatar: string;
}

//update profile picture
export const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body;

        const userId = req.user?._id;

        const user = await userModel.findById(userId);

        if (avatar && user) {

            if (user?.avatar?.public_id) {
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                }

            } else {
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                }
            }
        }

        await user?.save();

        await redis.set(userId, JSON.stringify(user));

        res.status(201).json({
            success: true,
            user,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

//get all users --only for admin
export const getAllUsers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllUsersService(res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

//update user role --only for admin
export const updateUserRole = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, role } = req.body;
        const user = await userModel.findOne({ email });

        if (user) {
            updateUserRoleService(res, user._id, role);
        } else {
            res.status(400).json({
                success: false,
                message: "User not found"
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

//delete user --only for admin
export const deleteUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = await userModel.findById(id);

        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        if (user?.avatar?.public_id) {
            await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
        }

        await user.deleteOne({ id });

        await redis.del(id);

        res.status(201).json({
            success: true,
            message: "User deleted successfully",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


interface UserCourse {
    courseId: string;
    progress: number;
    modules: string[]
}

// Function to mark module as complete and update course progress
export const markModuleComplete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { moduleId, courseId } = req.body;
        const userId = req.user?._id;

        const user = await userModel.findById(userId);
        console.log(req.body)
        const currentCourse = await CourseModel.findById(courseId)
        console.log(moduleId, courseId)

        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        if (!currentCourse) {
            return next(new ErrorHandler("Course not found", 404));
        }

        const course = user?.courses?.find((course: any) => course.courseId === courseId);

        if (!course) {
            return next(new ErrorHandler("User not enrolled", 404));
        }

        if (course.modules.indexOf(moduleId) === -1) {
            course.modules.push(moduleId)
            course.progress = ((course.modules.length / currentCourse.courseData.length) * 100);
        } else {
            return next(new ErrorHandler("Module already marked as complete", 400));
        }

        await user.save();

        await redis.set(userId, JSON.stringify(user));

        res.status(201).json({
            success: true,
            message: "Module marked as complete",
        });
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
}

//Function to mark module as incomplete and update course progress
export const markModuleIncomplete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { moduleId, courseId } = req.body;
        const userId = req.user?._id;

        const user = await userModel.findById(userId);

        const currentCourse = await CourseModel.findById(courseId)

        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        if (!currentCourse) {
            return next(new ErrorHandler("Course not found", 404));
        }

        const course = user?.courses?.find((course: any) => course.courseId === courseId);
        if (!course) {
            return next(new ErrorHandler("User not enrolled", 404));
        }
        if (course.modules.indexOf(moduleId) === -1) {
            return next(new ErrorHandler("Module not marked as complete", 400));
        } else {
            course.modules.splice(course.modules.indexOf(moduleId), 1);
            course.progress = ((course.modules.length / currentCourse.courseData.length) * 100);
        }
        await user.save();
        await redis.set(userId, JSON.stringify(user));
        res.status(201).json({
            success: true,
            message: "Module marked as incomplete",
        });
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
}

//function to provide course progress
export const getCourseProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId } = req.params;
        const userId = req.user?._id;

        const user = await userModel.findById(userId);

        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        const course = user?.courses?.find((course: any) => course.courseId === courseId);

        if (!course) {
            return next(new ErrorHandler("User not enrolled", 404));
        }

        res.status(201).json({
            success: true,
            progress: course.progress,
        });
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
}