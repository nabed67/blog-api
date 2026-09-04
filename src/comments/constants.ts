export const COMMENT_SELECT = {
  id: true,
  content: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  },
  _count: {
    select: { replies: true },
  },
} as const;
