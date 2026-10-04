import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create a dummy test user & profile
  const userId = uuidv7();
  const profileId = uuidv7();
  
  const user = await prisma.user.upsert({
    where: { emailHash: 'dummy_hash_for_seed' },
    update: {},
    create: {
      id: userId,
      emailHash: 'dummy_hash_for_seed',
      emailCiphertext: 'dummy_cipher',
      emailKeyId: 'v1',
      role: 'ADMIN',
      profile: {
        create: {
          id: profileId,
          handle: 'admin',
          bio: 'System Administrator',
          trustLevel: 4,
        },
      },
    },
  });

  console.log(`✅ Created Admin User: ${user.id}`);

  // 2. Create communities
  const communityData = [
    { name: 'General', slug: 'general', description: 'General discussion for everything.' },
    { name: 'Help', slug: 'help', description: 'Ask questions and get help with your code.' },
    { name: 'Showcase', slug: 'showcase', description: 'Show off what you built!' },
  ];

  for (const c of communityData) {
    const community = await prisma.community.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        id: uuidv7(),
        name: c.name,
        slug: c.slug,
        description: c.description,
        createdById: profileId,
        members: {
          create: {
            profileId: profileId,
            role: 'OWNER',
          }
        }
      },
    });
    console.log(`✅ Created Community: c/${community.slug}`);

    // Create a welcome post in each community
    if (c.slug === 'general') {
      const postId = uuidv7();
      await prisma.post.create({
        data: {
          id: postId,
          communityId: community.id,
          authorId: profileId,
          title: 'Welcome to Coddite!',
          bodyMarkdown: 'Welcome to the anonymous coding community. Keep it respectful.',
          isPinned: true,
          status: 'PUBLISHED',
          comments: {
            create: {
              id: uuidv7(),
              authorId: profileId,
              bodyMarkdown: 'First comment! Woo!',
            }
          }
        }
      });
      console.log(`✅ Created Post in c/${community.slug}`);
    }
  }

  console.log('✅ Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
