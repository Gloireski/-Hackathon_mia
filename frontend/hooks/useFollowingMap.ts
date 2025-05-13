import { useEffect, useState, useCallback } from "react";

/**
 * Hook personnalisé pour gérer le suivi des utilisateurs
 * @param followingUsers tableau des IDs d'utilisateurs suivis (provenant du backend)
 * @returns un map isFollowing + une fonction pour le mettre à jour
 */
export function useFollowingMap(followingUsers: string[] | undefined) {
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (Array.isArray(followingUsers)) {
      const map: Record<string, boolean> = {};
      followingUsers.forEach((userId) => {
        map[userId] = true;
      });
      setFollowingMap(map);
    }
  }, [followingUsers]);

  // fonction pour mettre à jour le suivi d’un utilisateur
  const toggleFollow = useCallback((userId: string) => {
    setFollowingMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }, []);

  return {
    followingMap,
    toggleFollow,
  };
}
