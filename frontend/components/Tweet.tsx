"use client";
 
import { useState } from "react";
import { 
  HeartIcon as HeartOutline, 
  ChatBubbleOvalLeftIcon, 
  ArrowPathIcon, 
  UserPlusIcon, 
  CheckIcon 
} from "@heroicons/react/24/outline";
 
import { 
  HeartIcon as HeartSolid, 
  ArrowPathIcon as ArrowPathSolid 
} from "@heroicons/react/24/solid";

import { FOLLOW_MUTATION, LIKE_TWEET, RE_TWEET  } from "../graphql/mutations"
import { useMutation } from "@apollo/client"
import { useAppContext } from "@/app/context/AppContext"
import { timeAgo } from "@/utils/timeAgo";
 
interface TweetProps {
  id: string
  content: string
  isLiked: boolean
  createdAt: string
  likes: number
  isFollowing: boolean
  retweets: number
  isRetweet: boolean
  isRetweeted: boolean
  media: string
  comments: [string]
  author: {
    profile_img: string | undefined;
    _id: string;
    username: string
  },
  profile_img: string // Ajout de l'image de profil dynamique
  onFollowToggle: () => void
  handleFollowToggle: (userId: string) => void
}
 
export default function Tweet({
   id, content, createdAt, isFollowing, author, isLiked, likes,
   retweets, isRetweeted, comments, media
  }: TweetProps) {
  const [liked, setLiked] = useState(isLiked)
  const [retweeted, setRetweeted] = useState(isRetweeted)
  const [likesCount, setLikesCount] = useState(likes)
  const [retweetsCount, setRetweetsCount] = useState(retweets)
  const [following, setFollowing] = useState(isFollowing)
  const { appState } = useAppContext()

  const [likeTweet] = useMutation(LIKE_TWEET, {
    variables: { tweetId: id },
    update(cache, { data: { likeTweet } }) {
      cache.modify({
        id: cache.identify({ __typename: "Tweet", id }),
        fields: {
          likes(existingLikes = 0) {
            return likeTweet.liked ? existingLikes + 1 : existingLikes - 1;
          },
          liked() {
            return likeTweet.liked;
          },
        },
      });
    },
  });

  const [reTweet] = useMutation(RE_TWEET, {
    variables: { tweetId: id },
    update(cache, { data: { reTweet } }) {
      cache.modify({
        id: cache.identify({ __typename: "Tweet", id }),
        fields: {
          retweets(existingRetweets = 0) {
            return reTweet.success ? existingRetweets + 1 : existingRetweets - 1;
          },
          isRetweeted() {
            return reTweet.success;
          },
        },
      });
    },
  });

  const [followUser, { loading }] = useMutation(FOLLOW_MUTATION)

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
  
    try {
        const { data } = await followUser({
            variables: { userId: author._id },
        });

        console.log(data);
        const newFollowingState = data?.followUser?.isFollowing ?? !following;
        
        setFollowing(newFollowingState); // Mise à jour locale
        // Rafraîchir la page après un follow/unfollow
        window.location.reload();
    } catch (error) {
        console.error("Erreur lors du suivi de l'utilisateur:", error);
    }
};

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!appState?.isLoggedIn) return;

    try {
      const { data } = await likeTweet();
      if (data?.likeTweet?.success) {
        setLiked(data.likeTweet.liked);
        setLikesCount(data.likeTweet.likes);
      }
    } catch (error) {
      console.error("Erreur lors du like:", error);
    }
  }
 
  const handleRetweet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!appState?.isLoggedIn) return;

    try {
      const { data } = await reTweet();
      if (data?.reTweet?.success) {
        console.log(data)
        setRetweeted(!retweeted);
        setRetweetsCount(retweeted ? retweetsCount - 1 : retweetsCount + 1);
      }
    } catch (error) {
      console.error("Erreur lors du retweet:", error);
    }
  };

 
  return (
  <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
    <div className="flex gap-3">
      <img
        src={author.profile_img}
        alt={`${author.username}'s profile`}
        className="w-12 h-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold">{author.username}</span>
          <span className="text-gray-500">@{author.username}</span>
          <span className="text-gray-500">· {timeAgo(createdAt, "fr")}</span>
      </div>
      {/* follow button */}
      {/* {!(appState?.user?._id === author._id) &&(
      <button
        onClick={handleFollow}
        disabled={!appState?.isLoggedIn || loading}
        className={`flex items-center gap-1 px-3 py-1 text-sm font-medium 
          ${following ? "bg-blue-500 text-white" : "bg-black text-white"} 
          rounded-full hover:bg-gray-800 transition`} >
          {following ? <CheckIcon className="w-4 h-4" /> : <UserPlusIcon className="w-4 h-4" />}
          {following ? "Following" : "Follow"}
      </button>)} */}
    </div>
    
    <p className="mt-2">{content}</p>
    {media && (media.endsWith(".mp4") || media.endsWith(".webm")) ? (
      <video src={media} controls className="mt-2 w-full rounded-lg"></video>
    ) : media ? (
      <img src={media} alt="Tweet media" className="mt-2 w-full rounded-lg object-cover" />
    ) : null}
    <div className="flex gap-8 mt-4 text-gray-500">
      {/* comment icon button */}
      <button className="flex items-center gap-2 hover:text-blue-500">
        <ChatBubbleOvalLeftIcon className="w-5 h-5" />
        <span>{comments?comments.length:0}</span> {/* Ex: 1,200 */}
      </button>
      {/* retweet button */}
     
      <button 
          className={`flex items-center gap-2 ${retweeted ? "text-blue-500" : "hover:text-blue-500"}`}
          onClick={(e) => handleRetweet(e)}
          disabled={(appState?.user?._id === author._id)}
        >
        {retweeted ? <ArrowPathSolid className="w-5 h-5" /> : <ArrowPathIcon className="w-5 h-5" />}
        <span>{retweetsCount}</span>
      </button>
      {/* like unlike */}
      <button 
        className={`flex items-center gap-2 ${liked ? "text-red-500" : "hover:text-red-500"}`}
        onClick={(e) => handleLike(e)}
      >
        {liked ? <HeartSolid className="w-5 h-5" /> : <HeartOutline className="w-5 h-5" />}
        <span>{likesCount}</span>
      </button>
    </div>
    </div>
    </div>
  </div>
  );
}