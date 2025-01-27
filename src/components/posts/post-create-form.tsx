'use client';

import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import {
  Input,
  Button,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@nextui-org/react';
import * as actions from '@/actions';
import FormButton from '@/components/common/form-button';

interface PostCreateFormProps {
  slug: string;
  topic: {
    id: string;
    name: string;
    description: string;
    slug: string;
    userId: string;
  };
}

export default function PostCreateForm({ slug, topic }: PostCreateFormProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ title?: string[]; content?: string[] }>({});
  const [editData, setEditData] = useState<{ id?: string; name?: string; description?: string }>({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setCurrentUserId(session?.user?.id || null);
    };

    fetchSession();
  }, []);

  const isUserSignedIn = !!currentUserId;
  const isTopicOwner = currentUserId === topic.userId;

  const handleEditOpen = (topic: { id: string; name: string; description: string }) => {
    setEditData(topic);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editData.id || !editData.name || !editData.description) {
      console.error('Invalid data: All fields are required');
      return;
    }

    const formState = { errors: {} };
    const formData = new FormData();
    formData.append('name', editData.name);
    formData.append('description', editData.description);

    const result = await actions.updateTopic(editData.id, formState, formData);

    if (result.errors && Object.keys(result.errors).length > 0) {
      console.error('Error updating topic:', result.errors);
    } else if (result.updatedTopicSlug) {
      console.log('Topic updated successfully');
      setEditData({});
      setIsEditOpen(false);
      window.location.href = `/topics/${result.updatedTopicSlug}`;
    }
  };
  
  const handleCreatePost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const formState = { errors: {} };
  
    try {
      const result = await actions.createPost(slug, formState, formData);
  
      if (result.errors && Object.keys(result.errors).length > 0) {
        console.error("Post creation failed:", result.errors);
  
        setValidationErrors({
          title: result.errors?.title || [],
          content: result.errors?.content || [],
        });
      } else {
        console.log("Post created successfully:", result.post);
  
        // Clear errors and close the modal
        setValidationErrors({});
        form.reset();
        setIsCreateOpen(false);
  
        // Optionally revalidate or fetch posts to update the UI
        // revalidate posts if necessary
      }
    } catch (error) {
      console.error("Error during post creation:", error);
    }
  };  

  const handleDeleteTopic = async (topicId: string) => {
    const confirmation = confirm('Are you sure you want to delete this topic?');
    if (!confirmation) return;
  
    try {
      const result = await actions.deleteTopic(topicId);
  
      if (result.errors && Object.keys(result.errors).length > 0) {
        console.error('Topic deletion failed:', result.errors);
      } else {
        console.log('Topic deleted successfully');
        window.location.href = '/'; // Redirect to the topics list page after deletion
      }
    } catch (error) {
      console.error('Error during topic deletion:', error);
    }
  };
  

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Popover
          isOpen={isCreateOpen}
          onOpenChange={(isOpen) => setIsCreateOpen(isOpen)}
          placement="left"
        >
          <PopoverTrigger>
            <Button
              color="primary"
              style={{ minWidth: '120px', padding: '0 16px' }}
              onClick={() => setIsCreateOpen(true)}
              isDisabled={!isUserSignedIn}
            >
              Create Post
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <form onSubmit={handleCreatePost}>
              <div className="flex flex-col gap-4 p-4 w-80">
                <h3 className="text-lg">Create a Post</h3>
                <Input
                  name="title"
                  label="Title"
                  placeholder="Title"
                  required
                  isInvalid={!!validationErrors.title}
                  errorMessage={validationErrors.title?.join(", ")}
                />
                <Textarea
                  name="content"
                  label="Content"
                  placeholder="Content"
                  required
                  isInvalid={!!validationErrors.content}
                  errorMessage={validationErrors.content?.join(", ")}
                />
                <FormButton>Create Post</FormButton>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        <Popover placement="left">
          <PopoverTrigger>
            <Button
              color="warning"
              style={{ minWidth: '120px', padding: '0 16px' }}
              onClick={() => handleEditOpen({ id: topic.id, name: topic.name, description: topic.description })}
              isDisabled={!isUserSignedIn || !isTopicOwner}
            >
              Edit Topic
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <form onSubmit={handleEditSubmit}>
              <div className="flex flex-col gap-4 p-4 w-80">
                <h3 className="text-lg">Edit a Topic</h3>
                <Input
                  value={editData.name || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                  label="Name"
                  placeholder="Edit Name"
                />
                <Textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
                  label="Description"
                  placeholder="Edit Description"
                />
                <FormButton>Edit Topic</FormButton>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        <Button
          color="danger"
          style={{ minWidth: '120px', padding: '0 16px' }}
          onClick={() => handleDeleteTopic(topic.id)}
          isDisabled={!isUserSignedIn || !isTopicOwner}
        >
          Remove Topic
        </Button>
      </div>
    </div>
  );
}
