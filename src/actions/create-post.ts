'use server';

import type { Post } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import paths from '@/paths';
import { redirect } from 'next/navigation';

const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

const updatePostSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(10).optional(),
});

interface CreatePostFormState {
  errors: {
    title?: string[];
    content?: string[];
    _form?: string[];
  };
}

export async function createPost(
  slug: string,
  formState: CreatePostFormState,
  formData: FormData
): Promise<{ post?: Post; errors: CreatePostFormState['errors'] }> {
  const result = createPostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
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
        _form: ['You must be signed in to do this'],
      },
    };
  }

  const topic = await db.topic.findFirst({
    where: { slug },
  });

  if (!topic) {
    return {
      errors: {
        _form: ['Cannot find topic'],
      },
    };
  }

  try {
    const post = await db.post.create({
      data: {
        title: result.data.title,
        content: result.data.content,
        userId: session.user.id,
        topicId: topic.id,
      },
    });

    revalidatePath(paths.topicShow(slug));
    return { post, errors: {} }; // Return the created post
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { errors: { _form: [err.message] } };
    } else {
      return { errors: { _form: ['Failed to create post'] } };
    }
  }
}

export async function updatePost(
  postId: string,
  topicSlug: string,
  formData: FormData
): Promise<{ errors?: { title?: string[]; content?: string[]; _form?: string[] } }> {
  const result = updatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const session = await auth();
  if (!session || !session.user) {
    return { errors: { _form: ['You must be signed in to do this.'] } };
  }

  const post = await db.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.userId !== session.user.id) {
    return { errors: { _form: ['You are not authorized to edit this post.'] } };
  }

  try {
    await db.post.update({
      where: { id: postId },
      data: {
        title: result.data.title || undefined,
        content: result.data.content || undefined,
      },
    });

    revalidatePath(paths.postShow(topicSlug, postId)); // Pass both `topicSlug` and `postId`
    return { errors: {} }; // No errors on success
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { errors: { _form: [err.message] } };
    } else {
      return { errors: { _form: ['Failed to update post.'] } };
    }
  }
}

export async function deletePost(
  postId: string
): Promise<{ topicId?: string; errors?: { _form?: string[] } }> {
  const session = await auth();
  if (!session || !session.user) {
    return { errors: { _form: ['You must be signed in to do this.'] } };
  }

  const post = await db.post.findUnique({
    where: { id: postId },
  });

  if (!post || post.userId !== session.user.id) {
    return { errors: { _form: ['You are not authorized to delete this post.'] } };
  }

  try {
    const topicId = post.topicId; // Get the topic ID before deleting the post

    await db.post.delete({
      where: { id: postId },
    });

    revalidatePath(paths.topicShow(topicId)); // Revalidate the topic's path

    return { topicId, errors: {} }; // Return the topic ID on success
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { errors: { _form: [err.message] } };
    } else {
      return { errors: { _form: ['Failed to delete post.'] } };
    }
  }
}

