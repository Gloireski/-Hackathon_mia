const { User } = require('../../../models/users')
const { verifyToken } = require('../../../utils/auth')
const { notificationQueue } = require("../../../queues/notificationQueue")

const userMutations = {
  follow: async (_, { userId }, { req }) => {
    const currentUser = await verifyToken(req);
    if (!currentUser) throw new Error("Authentification requise")
  
    if (currentUser.id === userId) {
      throw new Error("Vous ne pouvez pas vous suivre vous-même.");
    }
  
    const user = await User.findById(currentUser.id);
    const targetUser = await User.findById(userId);
  
    if (!targetUser) {
      throw new Error("Utilisateur introuvable.");
    }
  
    const alreadyFollowing = user.followings.includes(userId);
  
    if (alreadyFollowing) {
      user.followings = user.followings.filter(id => id.toString() !== userId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUser.id);
    } else {
      user.followings.push(userId);
      targetUser.followers.push(currentUser.id);
  
      await notificationQueue.add({
        recipientId: targetUser._id.toString(),
        message: `${user.username} vous suit maintenant!`,
      });
    }
  
    await user.save();
    await targetUser.save();
  
    return {
      success: true,
      following: !alreadyFollowing,
      followersCount: targetUser.followers.length
    };
  },

  bookmarkTweet: async (_, { tweetId }, { req }) => {
    const user = await verifyToken(req);
    if (!user) throw new Error("Authentification requise");
  
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new Error("Tweet non trouvé");
  
    const isBookmarked = user.bookmarks.includes(tweetId);
    if (isBookmarked) {
      user.bookmarks = user.bookmarks.filter(id => id.toString() !== tweetId);
    } else {
      user.bookmarks.push(tweetId);
    }
  
    await user.save();
    return user;
  },
}

module.exports = userMutations 