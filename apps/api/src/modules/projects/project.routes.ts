import { Router } from 'express';
import { projectController } from './project.controller';
import { activityController } from '../activities/activity.controller';
import { requireAuth } from '../../middleware/auth';

export const projectRouter = Router();

// All project routes require authentication
projectRouter.use(requireAuth);

projectRouter.get('/', (req, res, next) => projectController.list(req, res, next));
projectRouter.post('/', (req, res, next) => projectController.create(req, res, next));
projectRouter.get('/:id', (req, res, next) => projectController.getById(req, res, next));
projectRouter.patch('/:id', (req, res, next) => projectController.update(req, res, next));
projectRouter.delete('/:id', (req, res, next) => projectController.delete(req, res, next));

// Project Activities Feed
projectRouter.get('/:id/activities', (req, res, next) => activityController.listForProject(req, res, next));

// Project Membership Routes
projectRouter.post('/:id/members', (req, res, next) => projectController.addMember(req, res, next));
projectRouter.delete('/:id/members/:userId', (req, res, next) => projectController.removeMember(req, res, next));
