/**
 * Interface pour les données d'un commentaire
 * @interface Comment
 */
export interface Comment {
    id: number;
    author: {
        _id: string
        username: string
        profile_img: string
        handle: string
    }
    content: string
    createdAt: string
}

/**
 * Interface pour les données d'un tweet
 * @interface TweetData
 */
export interface TweetData {
    id: number;
    username: string;
    handle: string;
    content: string;
    time: string;
    isFollowing: boolean;
}