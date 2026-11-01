import { Router } from 'express';
import { userController } from './user.controller';
import { requireAuth } from '../../middleware/auth';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/me', (req, res, next) => userController.getMe(req, res, next));
userRouter.patch('/me', (req, res, next) => userController.updateMe(req, res, next));
userRouter.patch('/me/password', (req, res, next) => userController.changePassword(req, res, next));
userRouter.patch('/me/theme', (req, res, next) => userController.updateTheme(req, res, next));
userRouter.delete('/me', (req, res, next) => userController.deleteAccount(req, res, next));
userRouter.get('/', (req, res, next) => userController.listUsers(req, res, next));
