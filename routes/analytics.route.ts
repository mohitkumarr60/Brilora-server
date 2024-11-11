import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getCoursesAnalytics, getOrdersAnalytics, getTotalOrders, getTotalUsers, getUsersAnalytics } from "../controllers/analytics.controller";

const analyticsRouter = express.Router();

analyticsRouter.get(
    "/get-user-analytics",
    isAuthenticated,
    authorizeRoles("admin"),
    getUsersAnalytics
);

analyticsRouter.get(
    "/get-course-analytics",
    isAuthenticated,
    authorizeRoles("admin"),
    getCoursesAnalytics
);

analyticsRouter.get(
    "/get-order-analytics",
    isAuthenticated,
    authorizeRoles("admin"),
    getOrdersAnalytics
);

analyticsRouter.get(
    "/get-total-users",
    isAuthenticated,
    authorizeRoles("admin"),
    getTotalUsers
);

analyticsRouter.get(
    "/get-total-orders",
    isAuthenticated,
    authorizeRoles("admin"),
    getTotalOrders
);

export default analyticsRouter;