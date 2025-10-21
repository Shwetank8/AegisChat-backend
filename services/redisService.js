const redis = require('../config/redis');

class RedisService {
  constructor() {
    this.ROOM_PREFIX = 'room:';
    this.MESSAGE_PREFIX = 'messages:';
    this.FILE_PREFIX = 'files:';
  }

  // Room operations
  async createRoom(roomId, data) {
    const roomKey = this.ROOM_PREFIX + roomId;
    //HMSET: Sets the specified fields to their respective values in the hash stored at key.
    await redis.hmset(roomKey, 
      'encryptionKey', data.encryptionKey,
      'createdAt', new Date().toISOString()
    );
    // Set room expiry to 24 hours of inactivity
    await redis.expire(roomKey, 24 * 60 * 60);
  }

  async getRoomData(roomId) {
    const roomKey = this.ROOM_PREFIX + roomId;
    // HGETALL: Returns all fields and values of the hash stored at key. 
    const data = await redis.hgetall(roomKey);
    return data;
  }

  // Active users operations
  async addUserToRoom(roomId, userId, username) {
    const userKey = `${this.ROOM_PREFIX}${roomId}:users`;
    // HSET: Sets field in the hash stored at key to value.
    await redis.hset(userKey, userId, username);
    await redis.expire(userKey, 24 * 60 * 60);
  }

  async removeUserFromRoom(roomId, userId) {
    const userKey = `${this.ROOM_PREFIX}${roomId}:users`;
    // HDEL: Removes the specified field from the hash stored at key.
    await redis.hdel(userKey, userId);
  }

  async getRoomUsers(roomId) {
    const userKey = `${this.ROOM_PREFIX}${roomId}:users`;
    const users = await redis.hgetall(userKey);
    return Object.entries(users || {}).map(([id, username]) => ({ id, username }));
  }

  // Message operations
  async addMessage(roomId, message) {
    const messageKey = this.MESSAGE_PREFIX + roomId;
    // RPUSH: Append one or multiple values to a list
    await redis.rpush(messageKey, JSON.stringify(message));
    // Keep messages for 24 hours
    await redis.expire(messageKey, 24 * 60 * 60);
  }

  async getMessages(roomId) {
    const messageKey = this.MESSAGE_PREFIX + roomId;
    // LRANGE: Returns the specified elements of the list stored at key.
    const messages = await redis.lrange(messageKey, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  }

  // File operations
  async addFile(roomId, fileId, fileData) {
    const fileKey = `${this.FILE_PREFIX}${roomId}`;
    await redis.hset(fileKey, fileId.toString(), JSON.stringify(fileData));
    await redis.expire(fileKey, 24 * 60 * 60);
  }

  async getFile(roomId, fileId) {
    const fileKey = `${this.FILE_PREFIX}${roomId}`;
    const fileData = await redis.hget(fileKey, fileId.toString());
    return fileData ? JSON.parse(fileData) : null;
  }

  // Room activity
  async updateRoomActivity(roomId) {
    const roomKey = this.ROOM_PREFIX + roomId;
    const messageKey = this.MESSAGE_PREFIX + roomId;
    const fileKey = `${this.FILE_PREFIX}${roomId}`;
    const userKey = `${this.ROOM_PREFIX}${roomId}:users`;
    
    // Extend expiration time for all room-related keys
    await Promise.all([
      redis.expire(roomKey, 24 * 60 * 60),
      redis.expire(messageKey, 24 * 60 * 60),
      redis.expire(fileKey, 24 * 60 * 60),
      redis.expire(userKey, 24 * 60 * 60)
    ]);
  }
}

module.exports = new RedisService();