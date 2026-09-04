export const ALLOWED_TAGS = [
  'b',
  'i',
  'a',
  'p',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'img',
  'strong',
  'em',
  'blockquote',
  'br',
];

export const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'class',
  'target',
  'rel',
];

export const POST_SELECT = {
  id: true,
  title: true,
  slug: true,
  content: true,
  status: true,
  viewCount: true,
  likeCount: true,
  dislikeCount: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;
