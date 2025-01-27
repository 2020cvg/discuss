import Link from 'next/link';
import { Suspense } from 'react';
import PostShow from '@/components/posts/post-show';
import PostShowLoading from '@/components/posts/post-show-loading';
import CommentList from '@/components/comments/comment-list';
import CommentCreateForm from '@/components/comments/comment-create-form';
import paths from '@/paths';
import { fetchTopicBySlug } from '@/db/queries/topics'; // Import function to fetch topic details
import { auth } from "@/auth";
import { db } from "@/db";

interface PostShowPageProps {
  params: {
    slug: string;
    postId: string;
  };
}

export default async function PostShowPage({ params }: PostShowPageProps) {
  const { postId, slug: topicSlug } = params;

  // Fetch the authenticated user session
  const session = await auth();
  const sessionUserId = session?.user?.id || null;

  // Fetch the post details
  const post = await db.post.findFirst({
    where: { id: postId },
  });

  if (!post) {
    return <div>Post not found</div>;
  }

  // Fetch the topic details
  const topic = await fetchTopicBySlug(topicSlug);

  if (!topic) {
    return <div>Topic not found</div>;
  }

  return (
    <div className="space-y-3">
      {/* Use the topic's name instead of the slug */}
      <Link className="underline decoration-solid" href={paths.topicShow(topicSlug)}>
        {'< '}Back to {topic.name}
      </Link>
      <Suspense fallback={<PostShowLoading />}>
        <PostShow
          postId={postId}
          topicSlug={topicSlug}
          post={post}
        />
      </Suspense>
      <CommentCreateForm postId={postId} startOpen />
      <CommentList postId={postId} />
    </div>
  );
}
