const CryptoJS = require('crypto-js');
const crypto = require('crypto');

// Generate a random IV (16 bytes for AES)
const generateIV = () => {
  return CryptoJS.lib.WordArray.random(16);
};

// Encrypt file with AES-CBC
const encryptFile = (buffer, key) => {
  try {
    // Generate a random IV
    const iv = generateIV();
    
    // Convert buffer to base64 string
    const content = Buffer.from(buffer).toString('base64');
    
    // Encrypt the content
    const encrypted = CryptoJS.AES.encrypt(content, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Combine IV and encrypted content
    const result = {
      iv: iv.toString(),
      content: encrypted.toString()
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
};

// Decrypt file
const decryptFile = (encryptedStr, key) => {
  try {
    // Parse the combined data
    const { iv, content } = JSON.parse(encryptedStr);
    
    // Decrypt the content
    const decrypted = CryptoJS.AES.decrypt(content, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Convert the decrypted data back to buffer
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    return Buffer.from(decryptedStr, 'base64');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
};

module.exports = {
  encryptFile,
  decryptFile,
  generateIV
};