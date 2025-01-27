import PostCreateForm from '@/components/posts/post-create-form';
import PostList from '@/components/posts/post-list';
import { fetchPostsByTopicSlug } from '@/db/queries/posts';
import { fetchTopicBySlug } from '@/db/queries/topics';

interface TopicShowPageProps {
  params: {
    slug: string;
  };
}

export default async function TopicShowPage({ params }: TopicShowPageProps) {
  const { slug } = params;

  // Fetch the topic data
  const topic = await fetchTopicBySlug(slug);

  if (!topic) {
    return <div>Topic not found</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      <div className="col-span-3">
        {/* Display the topic's name instead of the slug */}
        <h1 className="text-2xl font-bold mb-2">{topic.name}</h1>
        <PostList fetchData={() => fetchPostsByTopicSlug(slug)} />
      </div>
      <div>
        <PostCreateForm slug={slug} topic={topic} />
      </div>
    </div>
  );
}
