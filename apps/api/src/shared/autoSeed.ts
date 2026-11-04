import bcrypt from 'bcryptjs';
import { Role, ProjectRole, IssueType, IssuePriority } from '@prisma/client';
import { prisma } from './prisma';
import { logger } from './logger';

export async function autoSeedDatabase(): Promise<void> {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      logger.info('Database already contains users. Skipping auto-seed.');
      return;
    }

    logger.info('🌱 Empty database detected. Running initial auto-seed for demo data...');
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Seed Users
    const adminUser = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@flowtrack.dev',
        password: passwordHash,
        role: Role.ADMIN,
        themePreference: 'dark',
        emailVerifiedAt: new Date(),
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        name: 'Sarah Connor',
        email: 'manager@flowtrack.dev',
        password: passwordHash,
        role: Role.MANAGER,
        themePreference: 'light',
        emailVerifiedAt: new Date(),
      },
    });

    const regularUser = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'user@flowtrack.dev',
        password: passwordHash,
        role: Role.USER,
        themePreference: 'light',
        emailVerifiedAt: new Date(),
      },
    });

    // 2. Seed Statuses
    const todoStatus = await prisma.status.create({
      data: { name: 'To Do', order: 1 },
    });

    const inProgressStatus = await prisma.status.create({
      data: { name: 'In Progress', order: 2 },
    });

    const doneStatus = await prisma.status.create({
      data: { name: 'Done', order: 3 },
    });

    // 3. Seed Workflow Transitions
    await prisma.workflowTransition.createMany({
      data: [
        { fromStatusId: todoStatus.id, toStatusId: inProgressStatus.id },
        { fromStatusId: inProgressStatus.id, toStatusId: doneStatus.id },
        { fromStatusId: inProgressStatus.id, toStatusId: todoStatus.id },
        { fromStatusId: doneStatus.id, toStatusId: inProgressStatus.id },
      ],
    });

    // 4. Seed Projects
    const ecomProject = await prisma.project.create({
      data: {
        name: 'Ecommerce Platform',
        key: 'ECOM',
        description: 'Next-generation headless commerce platform.',
        members: {
          create: [
            { userId: adminUser.id, role: ProjectRole.ADMIN },
            { userId: managerUser.id, role: ProjectRole.ADMIN },
            { userId: regularUser.id, role: ProjectRole.MEMBER },
          ],
        },
      },
    });

    // 5. Seed Issues
    const paymentEpic = await prisma.issue.create({
      data: {
        projectId: ecomProject.id,
        title: 'Payment Gateway Integration',
        description: 'Integrate Stripe and PayPal for seamless international checkout.',
        type: IssueType.FEATURE,
        priority: IssuePriority.HIGH,
        statusId: inProgressStatus.id,
        reporterId: managerUser.id,
        assigneeId: regularUser.id,
      },
    });

    await prisma.issue.create({
      data: {
        projectId: ecomProject.id,
        parentId: paymentEpic.id,
        title: 'Configure Stripe Webhook Listener',
        description: 'Handle charge.succeeded and customer.subscription.created events.',
        type: IssueType.TASK,
        priority: IssuePriority.MEDIUM,
        statusId: inProgressStatus.id,
        reporterId: managerUser.id,
        assigneeId: regularUser.id,
      },
    });

    await prisma.issue.create({
      data: {
        projectId: ecomProject.id,
        parentId: paymentEpic.id,
        title: 'Design Checkout Payment Form',
        description: 'Build accessible payment form with credit card formatting and 3D Secure verification.',
        type: IssueType.TASK,
        priority: IssuePriority.MEDIUM,
        statusId: doneStatus.id,
        reporterId: managerUser.id,
        assigneeId: regularUser.id,
      },
    });

    await prisma.issue.create({
      data: {
        projectId: ecomProject.id,
        title: 'Cart item count does not update when item is removed',
        description: 'Steps to reproduce: Add item to cart, click remove, badge still displays previous count.',
        type: IssueType.BUG,
        priority: IssuePriority.HIGH,
        statusId: todoStatus.id,
        reporterId: adminUser.id,
        assigneeId: regularUser.id,
      },
    });

    // 6. Seed Client & Task
    const sampleClient = await prisma.client.create({
      data: {
        name: 'Acme Retail Corp',
        userId: adminUser.id,
      },
    });

    await prisma.task.create({
      data: {
        userId: adminUser.id,
        client: sampleClient.name,
        taskBugName: 'Migrate Product Catalog to Microservice',
        owner: 'John Doe',
        priority: 'High',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-15'),
        devStatus: 'In-progress',
        unitTestStatus: 'Completed',
        stagingStatus: 'New',
        prodStatus: 'NA',
        comment: 'Catalog DB schema completed.',
      },
    });

    logger.info('🎉 Initial database auto-seed completed successfully!');
  } catch (error) {
    logger.warn({ error }, 'Auto-seed check encountered an issue (skipping, non-fatal)');
  }
}
