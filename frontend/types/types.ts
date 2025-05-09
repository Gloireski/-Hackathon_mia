import { Author } from "./TweetModel";
/**
 * Interface pour les données d'un commentaire
 * @interface Comment
 */
export interface CommentModel {
    id: string;
    author: Author
    content: string
    createdAt: string
    tweetId: string
}
