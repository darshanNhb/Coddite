import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CS student database seed...');

  // 1. Create dummy users for seeding content
  const users = [
    { id: uuidv7(), profileId: uuidv7(), emailHash: 'admin_hash', handle: 'root_admin', bio: 'Platform admin & systems geek' },
    { id: uuidv7(), profileId: uuidv7(), emailHash: 'user1_hash', handle: 'algo_hustler', bio: 'Grinding LeetCode all day' },
    { id: uuidv7(), profileId: uuidv7(), emailHash: 'user2_hash', handle: 'neural_net_noob', bio: 'Trying to understand backprop' },
    { id: uuidv7(), profileId: uuidv7(), emailHash: 'user3_hash', handle: 'react_enjoyer', bio: 'useState is all I need' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { emailHash: u.emailHash },
      update: {},
      create: {
        id: u.id,
        emailHash: u.emailHash,
        emailCiphertext: 'dummy_cipher',
        emailKeyId: 'v1',
        role: u.handle === 'root_admin' ? 'ADMIN' : 'USER',
        profile: {
          create: {
            id: u.profileId,
            handle: u.handle,
            bio: u.bio,
            trustLevel: u.handle === 'root_admin' ? 4 : 1,
          },
        },
      },
    });
    console.log(`✅ Created User: ${u.handle}`);
  }

  const [admin, algo, ml, web] = users;

  // 2. Create communities
  const communityData = [
    { name: 'Data Structures & Algorithms', slug: 'dsa', description: 'LeetCode, interview prep, and algorithm optimization strategies.' },
    { name: 'Web Development', slug: 'web-dev', description: 'React, Node.js, Frontend, Backend, and everything web.' },
    { name: 'Machine Learning', slug: 'ai-ml', description: 'Deep learning, neural networks, PyTorch, TensorFlow, and NLP.' },
    { name: 'Systems & OS', slug: 'systems', description: 'C/C++, Rust, Operating Systems, and low-level programming.' },
    { name: 'Cybersecurity', slug: 'infosec', description: 'CTFs, ethical hacking, cryptography, and network security.' },
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
        createdById: admin.profileId,
        members: {
          create: [
            { profileId: admin.profileId, role: 'OWNER' },
            { profileId: algo.profileId, role: 'MEMBER' },
            { profileId: ml.profileId, role: 'MEMBER' },
            { profileId: web.profileId, role: 'MEMBER' },
          ]
        }
      },
    });
    console.log(`✅ Created Community: c/${community.slug}`);

    // Create posts based on community
    if (c.slug === 'dsa') {
      await prisma.post.create({
        data: {
          id: uuidv7(),
          communityId: community.id,
          authorId: algo.profileId,
          title: 'I finally understand Dynamic Programming (DP)!',
          bodyMarkdown: 'I struggled with DP for months. The trick was realizing it is just recursion + memoization. Stop trying to jump straight to the bottom-up tabulation approach. Write the recursive tree first, cache the states, and THEN convert to a table if needed for space optimization. Hope this helps anyone struggling!',
          status: 'PUBLISHED',
          comments: {
            create: [
              { id: uuidv7(), authorId: web.profileId, bodyMarkdown: 'Wow, thanks! I have an interview tomorrow and DP is my weakest area.' },
              { id: uuidv7(), authorId: ml.profileId, bodyMarkdown: 'Top-down memoization ftw. Tabulation just gives me a headache.' }
            ]
          }
        }
      });
      await prisma.post.create({
        data: {
          id: uuidv7(),
          communityId: community.id,
          authorId: web.profileId,
          title: 'Is doing 500 LeetCode problems actually necessary?',
          bodyMarkdown: 'I see people posting that they did 500+ problems. I have done about 150 (mostly medium/easy blind 75) and feel pretty confident. Am I missing something?',
          status: 'PUBLISHED',
        }
      });
    }

    if (c.slug === 'web-dev') {
      await prisma.post.create({
        data: {
          id: uuidv7(),
          communityId: community.id,
          authorId: web.profileId,
          title: 'Why is centering a div still a meme in 2026?',
          bodyMarkdown: 'With flexbox and grid, centering a div is literally just `display: flex; justify-content: center; align-items: center;`. Why do people still pretend it is hard?',
          status: 'PUBLISHED',
          comments: {
            create: { id: uuidv7(), authorId: algo.profileId, bodyMarkdown: 'Because backend devs like me refuse to learn CSS 😂' }
          }
        }
      });
    }

    if (c.slug === 'ai-ml') {
      await prisma.post.create({
        data: {
          id: uuidv7(),
          communityId: community.id,
          authorId: ml.profileId,
          title: 'PyTorch vs TensorFlow for a beginner project?',
          bodyMarkdown: 'I am taking Andrew Ng\'s ML course and want to start my first real computer vision project. Which framework should I learn first?',
          status: 'PUBLISHED',
          comments: {
            create: { id: uuidv7(), authorId: admin.profileId, bodyMarkdown: 'PyTorch. It is way more pythonic and standard in academia right now. TF is mostly legacy production systems.' }
          }
        }
      });
    }
    
    if (c.slug === 'systems') {
      await prisma.post.create({
        data: {
          id: uuidv7(),
          communityId: community.id,
          authorId: admin.profileId,
          title: 'Should I learn Rust or C++ for systems programming?',
          bodyMarkdown: 'I want to get into OS development and maybe game engine dev. Rust memory safety looks great, but C++ is the industry standard. Thoughts?',
          status: 'PUBLISHED',
        }
      });
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
