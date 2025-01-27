import { db } from '@/db';

export async function fetchTopicBySlug(slug: string) {
    return db.topic.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        userId: true,
      },
    });
  }
  
