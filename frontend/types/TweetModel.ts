
export interface Author {
    _id: string
    username: string
    profile_img: string
    handle: string
}

export interface TweetModel {
  id: string;
  content: string;
  createdAt: string;
  isLiked: boolean;
  likes: number;
  retweets: number;
  isRetweet: boolean;
  isRetweeted: boolean;
  comments: string[];
  media: string;
  author: Author;
}