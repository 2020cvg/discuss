'use server';

import type { Topic } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import paths from '@/paths';

const createTopicSchema = z.object({
  name: z
    .string()
    .min(3)
    .regex(/[a-z-]/, {
      message: 'Must be lowercase letters or dashes without spaces',
    }),
  description: z.string().min(10),
});

interface FormState {
  errors: {
    name?: string[];
    description?: string[];
    _form?: string[];
  };
}

export async function createTopic(
  formState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = createTopicSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session || !session.user) {
    return {
      errors: {
        _form: ['You must be signed in to do this.'],
      },
    };
  }

  const reservedWords = ['topic', 'admin', 'dashboard']; // Add more reserved words as needed
  const slugBase = result.data.name.toLowerCase().replace(/\s+/g, '-'); // Convert name to a URL-friendly slug
  let slug = slugBase;

  if (reservedWords.includes(slug)) {
    slug = `${slug}-${Date.now()}`; // Append a timestamp to avoid conflicts
  }

  // Ensure the slug is unique in the database
  let count = 1;
  while (await db.topic.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${count}`;
    count++;
  }

  let topic: Topic;
  try {
    topic = await db.topic.create({
      data: {
        name: result.data.name,
        slug,
        description: result.data.description,
        userId: session.user.id, // Associate topic with the user
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return {
        errors: {
          _form: [err.message],
        },
      };
    } else {
      return {
        errors: {
          _form: ['Something went wrong'],
        },
      };
    }
  }

  revalidatePath('/');
  redirect(paths.topicShow(topic.slug));
}

const updateTopicSchema = z.object({
  name: z.string().min(3).regex(/[a-z-]/, {
    message: 'Must be lowercase letters or dashes without spaces',
  }).optional(), // Chain optional after all validations
  description: z.string().min(10).optional(), // Chain optional here as well
});

export async function updateTopic(
  id: string,
  formState: FormState,
  formData: FormData
): Promise<FormState & { updatedTopicSlug?: string }> {
  const result = updateTopicSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session || !session.user) {
    return {
      errors: {
        _form: ['You must be signed in to do this.'],
      },
    };
  }

  const topic = await db.topic.findUnique({ where: { id } });

  if (!topic || topic.userId !== session.user.id) {
    return {
      errors: {
        _form: ['You are not authorized to update this topic.'],
      },
    };
  }

  const reservedWords = ['topic', 'admin', 'dashboard']; // Reserved words
  const slugBase = result.data.name?.toLowerCase().replace(/\s+/g, '-') || topic.slug;
  let slug = slugBase;

  if (reservedWords.includes(slug)) {
    slug = `${slug}-${Date.now()}`;
  }

  let count = 1;
  while (await db.topic.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${count}`;
    count++;
  }

  try {
    const updatedTopic = await db.topic.update({
      where: { id },
      data: {
        slug,
        name: result.data.name || undefined,
        description: result.data.description || undefined,
      },
    });

    revalidatePath('/');
    return {
      updatedTopicSlug: updatedTopic.slug, // Include slug
      errors: {}, // Ensure `errors` is present in the returned object
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return {
        errors: {
          _form: [err.message],
        },
      };
    } else {
      return {
        errors: {
          _form: ['Something went wrong'],
        },
      };
    }
  }
}

export async function deleteTopic(id: string): Promise<FormState> {
  const session = await auth();
  if (!session || !session.user) {
    console.log('No session or user found'); // Debugging session
    return {
      errors: {
        _form: ['You must be signed in to do this.'],
      },
    };
  }

  console.log('Logged-in user ID:', session.user.id);

  const topic = await db.topic.findUnique({
    where: { id },
  });

  console.log('Topic ID passed to findUnique:', id);
  console.log('Result from findUnique:', topic);

  if (!topic || topic.userId !== session.user.id) {
    console.log('No topic found for the provided ID:', id);
    return {
      errors: {
        _form: ['You are not authorized to delete this topic.'],
      },
    };
  }

  try {
    await db.topic.delete({
      where: { id },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return {
        errors: {
          _form: [err.message],
        },
      };
    } else {
      return {
        errors: {
          _form: ['Something went wrong'],
        },
      };
    }
  }

  revalidatePath('/');
  return { errors: {} };
}