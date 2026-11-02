import { Request, Response, NextFunction } from 'express';
import { clientService } from './client.service';
import { createClientSchema, updateClientSchema } from '@flowtrack/shared';

export class ClientController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const clients = await clientService.listClients({
        id: user.id,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        data: clients,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const client = await clientService.getClientById(
        { id: user.id, role: user.role },
        req.params.id
      );

      res.status(200).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const validated = createClientSchema.parse(req.body);
      const client = await clientService.createClient({ id: user.id }, validated);

      res.status(201).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const validated = updateClientSchema.parse(req.body);
      const client = await clientService.updateClient(
        { id: user.id, role: user.role },
        req.params.id,
        validated
      );

      res.status(200).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      await clientService.deleteClient(
        { id: user.id, role: user.role },
        req.params.id
      );

      res.status(200).json({
        success: true,
        message: 'Client deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();

