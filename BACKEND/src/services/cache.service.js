
const redis = require("../config/redis")

const getCache = async (key) => {
    const data = await redis.get(key)

    return data ? JSON.parse(data) : null
}

const setCache = async (key, data, expiry = 10800) => {
    await redis.set(key, JSON.stringify(data), "EX", expiry)
}

const deleteCache = async (key) => {
    await redis.del(key)
}

module.exports = {
    getCache,
    setCache,
    deleteCache
}
