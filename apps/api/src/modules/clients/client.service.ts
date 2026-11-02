import { prisma } from '../../shared/prisma';
import {
  CreateClientInput,
  UpdateClientInput,
  ClientDTO,
  UserRole,
} from '@flowtrack/shared';
import { ForbiddenError, NotFoundError } from '../../shared/errors';

export class ClientService {
  async listClients(user: { id: string; role: UserRole }): Promise<ClientDTO[]> {
    const where: any = { deletedAt: null };
    if (user.role !== UserRole.ADMIN) {
      where.userId = user.id;
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      userId: c.userId,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async getClientById(
    user: { id: string; role: UserRole },
    id: string
  ): Promise<ClientDTO> {
    const client = await prisma.client.findFirst({
      where: { id, deletedAt: null },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    if (user.role !== UserRole.ADMIN && client.userId !== user.id) {
      throw new ForbiddenError('You do not have access to this client');
    }

    return {
      id: client.id,
      name: client.name,
      userId: client.userId,
      createdAt: client.createdAt.toISOString(),
    };
  }

  async createClient(
    user: { id: string },
    data: CreateClientInput
  ): Promise<ClientDTO> {
    const client = await prisma.client.create({
      data: {
        name: data.name.trim(),
        userId: user.id,
      },
    });

    return {
      id: client.id,
      name: client.name,
      userId: client.userId,
      createdAt: client.createdAt.toISOString(),
    };
  }

  async updateClient(
    user: { id: string; role: UserRole },
    id: string,
    data: UpdateClientInput
  ): Promise<ClientDTO> {
    await this.getClientById(user, id);

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: data.name.trim(),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      userId: updated.userId,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteClient(
    user: { id: string; role: UserRole },
    id: string
  ): Promise<void> {
    await this.getClientById(user, id);

    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const clientService = new ClientService();
