import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";

export const ErrorMiddleware = (err:any, req:Request, res: Response, next:NextFunction) =>{
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal server error';

    //for wrong mongodb id server
    if(err.name ==='castError'){
        const message = `Resource not found. Invalid: ${err.path}`;
        err = new ErrorHandler(message, 400);
    }

    // Duplicate key error
    if(err.code === 11000){
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(message, 400);
    }

    // wrong jwt error
    if(err.name ==='JsonWebTokenError'){
        const message = `Invalid Json token, try again`;
        err = new ErrorHandler(message, 400);
    }

    // jwt expired error
    if(err.name ==='TokenExpiredError'){
        const message = `Json Web Token is expired, try again`;
        err = new ErrorHandler(message, 400);
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
}