const { GraphQLUpload } = require('graphql-upload')
const tweetQueries = require('./tweets/queries')
const tweetMutations = require('./tweets/mutations')
const userQueries = require('./users/queries')
const userMutations = require('./users/mutations')
const authMutations = require('./auth/mutations')

const resolvers = {
  Upload: GraphQLUpload,

  Query: {
    ...tweetQueries,
    ...userQueries,
  },

  Mutation: {
    ...tweetMutations,
    ...userMutations,
    ...authMutations,
  },
}

module.exports = resolvers 