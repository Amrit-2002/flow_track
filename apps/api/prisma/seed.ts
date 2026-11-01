import { PrismaClient, Role, ProjectRole, IssueType, IssuePriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean up existing data in reverse order of foreign keys
  await prisma.activity.deleteMany({});
  await prisma.timeLog.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.savedFilter.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.workflowTransition.deleteMany({});
  await prisma.status.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

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

  console.log('✅ Seeded users (admin, manager, user).');

  // 3. Seed Statuses
  const todoStatus = await prisma.status.create({
    data: { name: 'To Do', order: 1 },
  });

  const inProgressStatus = await prisma.status.create({
    data: { name: 'In Progress', order: 2 },
  });

  const doneStatus = await prisma.status.create({
    data: { name: 'Done', order: 3 },
  });

  console.log('✅ Seeded statuses (To Do, In Progress, Done).');

  // 4. Seed Workflow Transitions (Exact match with Laravel WorkflowSeeder)
  await prisma.workflowTransition.createMany({
    data: [
      { fromStatusId: todoStatus.id, toStatusId: inProgressStatus.id },
      { fromStatusId: inProgressStatus.id, toStatusId: doneStatus.id },
      { fromStatusId: inProgressStatus.id, toStatusId: todoStatus.id },
      { fromStatusId: doneStatus.id, toStatusId: inProgressStatus.id },
    ],
  });

  console.log('✅ Seeded workflow transitions.');

  // 5. Seed Projects (Matches Laravel ProjectSeeder)
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

  const crmProject = await prisma.project.create({
    data: {
      name: 'CRM System',
      key: 'CRM',
      description: 'Customer Relationship Management system.',
      members: {
        create: [
          { userId: adminUser.id, role: ProjectRole.ADMIN },
          { userId: managerUser.id, role: ProjectRole.MEMBER },
        ],
      },
    },
  });

  const mobiProject = await prisma.project.create({
    data: {
      name: 'Mobile App',
      key: 'MOBI',
      description: 'iOS and Android mobile application.',
      members: {
        create: [
          { userId: managerUser.id, role: ProjectRole.ADMIN },
          { userId: regularUser.id, role: ProjectRole.MEMBER },
        ],
      },
    },
  });

  console.log('✅ Seeded projects (ECOM, CRM, MOBI) with members.');

  // 6. Seed Issues with Hierarchy (Epics & Subtasks)
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

  // Subtasks for payment epic
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

  const bugIssue = await prisma.issue.create({
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

  // 7. Seed Comments & Time Logs
  await prisma.comment.create({
    data: {
      issueId: paymentEpic.id,
      userId: regularUser.id,
      content: 'Stripe webhook signature validation has been implemented and tested against Stripe CLI.',
    },
  });

  await prisma.timeLog.create({
    data: {
      issueId: paymentEpic.id,
      userId: regularUser.id,
      timeSpent: 120, // 2 hours
      description: 'Webhook listener setup and local testing with mock payloads',
      logDate: new Date(),
    },
  });

  await prisma.activity.create({
    data: {
      issueId: paymentEpic.id,
      userId: managerUser.id,
      action: 'updated status',
      oldValue: 'To Do',
      newValue: 'In Progress',
    },
  });

  // 8. Seed Legacy Client & Tasks
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

  console.log('✅ Seeded comments, time logs, activities, and legacy tasks.');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

