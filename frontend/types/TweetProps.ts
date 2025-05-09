import { TweetModel } from "./TweetModel"

export interface TweetProps extends TweetModel {
    isFollowing: boolean
    onFollowToggle: (userId: string) => void;
}