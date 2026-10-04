import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Checking if there are any posts...");
  const posts = await prisma.post.findMany({ take: 2 });
  console.log("Posts count:", posts.length);
  
  if (posts.length > 0) {
    console.log("Sample post vector (first one):");
    const res = await prisma.$queryRaw`SELECT title, "searchVector"::text FROM posts LIMIT 1`;
    console.log(res);

    console.log("\\nTesting FTS search for a common word (e.g. 'test' or part of a title)...");
    
    // We can do a raw tsquery
    const searchRes = await prisma.$queryRaw`
      SELECT id, title, ts_rank("searchVector", websearch_to_tsquery('english', 'test')) as rank
      FROM posts
      WHERE "searchVector" @@ websearch_to_tsquery('english', 'test')
      ORDER BY rank DESC
      LIMIT 5
    `;
    console.log("Search Results for 'test':", searchRes);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
