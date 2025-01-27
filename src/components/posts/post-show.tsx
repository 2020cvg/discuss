"use client";

import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { Button, Input, Textarea } from "@nextui-org/react";
import * as actions from "@/actions";

interface PostShowProps {
  postId: string;
  topicSlug: string;
  post: { id: string; title: string; content: string; userId: string };
}

export default function PostShow({ postId, topicSlug, post }: PostShowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [updateErrors, setUpdateErrors] = useState<{ title?: string[]; content?: string[] }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        const userId = session?.user?.id || null;
        setCurrentUserId(userId);
        setIsOwner(userId === post.userId); // Determine ownership
        console.log("Fetched session userId:", userId);
        console.log("Post owner userId:", post.userId);
      } catch (error) {
        console.error("Failed to fetch session:", error);
      } finally {
        setLoading(false); // Set loading to false after fetching session
      }
    };

    fetchSession();
  }, [post.userId]);

  const handleUpdate = async () => {
    const formData = new FormData();
    formData.append("title", editTitle);
    formData.append("content", editContent);
  
    try {
      const result = await actions.updatePost(postId, topicSlug, formData);
  
      if (result && Object.keys(result.errors || {}).length > 0) {
        console.error("Post update failed:", result.errors);
  
        const validationErrors = {
          title: result.errors?.title || [], // Ensure `title` is an array
          content: result.errors?.content || [], // Ensure `content` is an array
          _form: result.errors?._form || [], // Handle `_form` if present
        };
  
        setUpdateErrors(validationErrors);
      } else {
        console.log("Post updated successfully");
        setUpdateErrors({}); // Clear errors
        setIsEditing(false); // Exit editing mode
      }
    } catch (error) {
      console.error("Error during update:", error);
    }
  };  

  const handleDelete = async () => {
    const confirmation = confirm("Are you sure you want to delete this post?");
    if (!confirmation) return;

    const result = await actions.deletePost(postId);

    if (result && Object.keys(result.errors || {}).length > 0) {
      console.error("Failed to delete post:", result.errors);
    } else {
      location.href = `/topics/${topicSlug}`;
    }
  };

  if (loading) {
    return <div>Loading...</div>; // Show loading state while session is being fetched
  }

  console.log("isOwner: ", isOwner);

  return (
    <div className="m-4">
      {isEditing ? (
        <div className="flex flex-col gap-4">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Edit title"
            label="Title"
            fullWidth
            isInvalid={!!updateErrors.title}
            errorMessage={updateErrors.title?.join(", ")}
          />
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Edit content"
            label="Content"
            fullWidth
            isInvalid={!!updateErrors.content}
            errorMessage={updateErrors.content?.join(", ")}
          />
          <div className="flex gap-2">
            <Button color="success" onClick={handleUpdate}>
              Save
            </Button>
            <Button color="default" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold my-2">{post.title}</h1>
          <p className="p-4 border rounded">{post.content}</p>
        </div>
      )}
      <div className="flex gap-2 mt-4">
        {!isEditing && (
          <Button
            color="warning"
            onClick={() => setIsEditing(true)}
            isDisabled={!isOwner}
            style={{ minWidth: "120px" }}
          >
            Edit
          </Button>
        )}
        {!isEditing && (
          <Button
            color="danger"
            onClick={handleDelete}
            isDisabled={!isOwner}
            style={{ minWidth: "120px" }}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
