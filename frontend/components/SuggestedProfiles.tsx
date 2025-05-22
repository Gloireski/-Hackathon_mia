/**
 * Composant de suggestions de profils à suivre
 * Affiche une liste de profils suggérés que l'utilisateur pourrait vouloir suivre
 */
"use client";

import { useState, useEffect } from "react";
import { gql, useQuery, useMutation } from "@apollo/client";

/**
 * GraphQL query to fetch suggested profiles
 */
const GET_SUGGESTED_PROFILES = gql`
  query GetSuggestedProfiles {
    getSuggestedProfiles {
      user {
        _id
        username
        handle
        profile_img
      }
      mutualFollowers
      isFollowing
    }
  }
`;

/**
 * GraphQL mutation to follow/unfollow a user
 */
const FOLLOW_USER = gql`
  mutation FollowUser($userId: ID!) {
    follow(userId: $userId) {
      success
      following
      followersCount
    }
  }
`;

/**
 * Interface définissant la structure d'un profil suggéré
 */
interface Profile {
  user: {
    _id: string;
    username: string;
    handle: string;
    profile_img: string;
  };
  mutualFollowers: number;
  isFollowing: boolean;
}

/**
 * Composant qui affiche les profils suggérés avec possibilité de les suivre
 */
export default function SuggestedProfiles() {
  // Query hook for fetching suggested profiles
  const { data, loading, error } = useQuery(GET_SUGGESTED_PROFILES);
  
  // Mutation hook for following/unfollowing users
  const [followUser] = useMutation(FOLLOW_USER);

  // Local state to manage profiles
  const [profiles, setProfiles] = useState<Profile[]>([]);

  console.log('profiles suggested', profiles)
  // Update local state when data is fetched
  useEffect(() => {
    if (data?.getSuggestedProfiles) {
      setProfiles(data.getSuggestedProfiles);
    }
  }, [data]);

  /**
   * Gère l'action de suivre/ne plus suivre un profil
   */
  const handleFollowToggle = async (userId: string, index: number) => {
    try {
      const { data } = await followUser({
        variables: { userId },
        optimisticResponse: {
          follow: {
            success: true,
            following: !profiles[index].isFollowing,
            followersCount: 0,
            __typename: "FollowResponse"
          }
        }
      });

      if (data?.follow?.success) {
        setProfiles((prevProfiles) =>
          prevProfiles.map((profile, i) =>
            i === index
              ? { ...profile, isFollowing: !profile.isFollowing }
              : profile
          )
        );
      }
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <h2 className="font-bold text-gray-900 text-lg mb-3">Who to follow</h2>
        <div className="animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="w-20 h-8 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <p className="text-red-500">Error loading suggestions</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h2 className="font-bold text-gray-900 text-lg mb-3">Suivez des utilisateurs</h2>
      
      {/* Liste des profils suggérés */}
      {profiles.map((profile, index) => (
        <div key={profile.user._id} className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg transition">
          {/* Informations du profil */}
          <div className="flex items-center gap-4">
            <img 
              src={profile.user.profile_img || "/default-avatar.png"} 
              alt={profile.user.username} 
              className="w-12 h-12 rounded-full object-cover border border-gray-300" 
            />
            <div>
              <p className="text-gray-900 font-semibold">{profile.user.username}</p>
              <p className="text-gray-500 text-sm">{profile.user.handle}</p>
              {profile.mutualFollowers > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  {profile.mutualFollowers} mutual follower{profile.mutualFollowers > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          {/* Bouton pour suivre/ne plus suivre */}
          <button
            onClick={() => handleFollowToggle(profile.user._id, index)}
            className={`px-5 py-2 text-sm font-medium rounded-full transition-all border border-gray-300 shadow-sm ${
              profile.isFollowing 
                ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600" 
                : "bg-white text-gray-900 hover:bg-gray-200"
            }`}
          >
            {profile.isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      ))}
      
      {/* Lien pour voir plus de suggestions */}
      {profiles.length > 0 && (
        <p className="text-blue-600 text-sm mt-3 cursor-pointer hover:underline">
          Show more
        </p>
      )}
    </div>
  );
}