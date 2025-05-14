const bcrypt = require('bcryptjs')
const { User } = require('../../../models/users')
const { generateTokens } = require('../../../services/tokenService')
const redis = require('../../../config/redis')

const authMutations = {
  register: async (_, { username, email, password }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const { accessToken: token } = await generateTokens(user);
    return { ...user._doc, id: user._id, token };
  },

  login: async (_, { email, password }) => {
    const user = await User.findOne({ email })
    if (!user) throw new Error("Utilisateur non trouvé")

    const match = await bcrypt.compare(password, user.password)
    if (!match) throw new Error("Mot de passe incorrect")

    const { accessToken: token } = await generateTokens(user)
    redis.set(`token_${user._id}`, token, 'EX', 7200)
    return { ...user._doc, id: user._id, token }
  },

  logout: async (_, __, { req }) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return { success: false, message: "Aucun token fourni." };
      }

      await redis.setex(`blacklist:${token}`, 604800, "invalid");

      return { success: true, message: "Déconnexion réussie." };
    } catch (error) {
      console.error("Erreur lors du logout:", error);
      return { success: false, message: "Erreur serveur." };
    }
  },
}

module.exports = authMutations 