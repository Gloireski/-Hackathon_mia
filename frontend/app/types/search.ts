export interface Author {
    _id: string;
    username: string;
    handle: string;
    profile_img?: string;
}

export interface SearchResult {
    id: string;
    content: string;
    createdAt: string;
    author: Author;
}

export interface SearchData {
    searchTweets: SearchResult[];
} 