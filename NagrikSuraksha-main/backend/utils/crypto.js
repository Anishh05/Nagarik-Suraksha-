const crypto = require('crypto');

/**
 * Cryptographic Utilities Module
 * 
 * This module provides secure encryption functions using AES and RSA algorithms.
 * It uses Node.js built-in 'crypto' module for all cryptographic operations.
 */

// Constants for encryption configuration
const AES_ALGORITHM = 'aes-256-cbc';
const AES_KEY_LENGTH = 32; // 256 bits / 8 = 32 bytes
const AES_IV_LENGTH = 16;  // 128 bits / 8 = 16 bytes
const RSA_PADDING = crypto.constants.RSA_PKCS1_OAEP_PADDING;
const RSA_HASH = 'sha256';

/**
 * Generate a cryptographically secure random buffer
 * @param {number} length - Length of the buffer in bytes
 * @returns {Buffer} - Random buffer
 */
function generateRandomBuffer(length) {
    return crypto.randomBytes(length);
}

/**
 * Generate a random 256-bit AES key
 * @returns {Buffer} - 32-byte AES key
 */
function generateAESKey() {
    return generateRandomBuffer(AES_KEY_LENGTH);
}

/**
 * Generate a random 128-bit Initialization Vector (IV)
 * @returns {Buffer} - 16-byte IV
 */
function generateIV() {
    return generateRandomBuffer(AES_IV_LENGTH);
}

/**
 * Encrypt data using AES-256-CBC encryption with a randomly generated key and IV
 * 
 * @param {string|Buffer} data - The data to encrypt
 * @returns {Object} - Object containing encrypted data, AES key, and IV
 * @returns {Buffer} returns.encryptedData - The encrypted data
 * @returns {Buffer} returns.aesKey - The 256-bit AES key used for encryption
 * @returns {Buffer} returns.iv - The 128-bit IV used for encryption
 * @returns {string} returns.algorithm - The encryption algorithm used
 * 
 * @example
 * const result = encryptWithAES('Hello, World!');
 * console.log({
 *   encryptedData: result.encryptedData.toString('base64'),
 *   aesKey: result.aesKey.toString('hex'),
 *   iv: result.iv.toString('hex')
 * });
 */
function encryptWithAES(data) {
    try {
        // Validate input
        if (!data) {
            throw new Error('Data to encrypt cannot be empty');
        }

        // Convert data to Buffer if it's a string
        const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

        // Generate random 256-bit AES key and 128-bit IV
        const aesKey = generateAESKey();
        const iv = generateIV();

        // Create cipher with AES-256-CBC
        const cipher = crypto.createCipheriv(AES_ALGORITHM, aesKey, iv);

        // Encrypt the data
        let encryptedData = cipher.update(dataBuffer);
        encryptedData = Buffer.concat([encryptedData, cipher.final()]);

        // Return encryption result
        return {
            encryptedData: encryptedData,
            aesKey: aesKey,
            iv: iv,
            algorithm: AES_ALGORITHM,
            keyLength: AES_KEY_LENGTH * 8, // Convert bytes to bits
            ivLength: AES_IV_LENGTH * 8     // Convert bytes to bits
        };

    } catch (error) {
        throw new Error(`AES encryption failed: ${error.message}`);
    }
}

/**
 * Decrypt data using AES-256-CBC decryption with provided key and IV
 * 
 * @param {Buffer} encryptedData - The encrypted data to decrypt
 * @param {Buffer} aesKey - The 256-bit AES key used for decryption
 * @param {Buffer} iv - The 128-bit IV used for decryption
 * @returns {Object} - Object containing decrypted data and metadata
 * @returns {Buffer} returns.decryptedData - The decrypted data as Buffer
 * @returns {string} returns.decryptedText - The decrypted data as UTF-8 string
 * @returns {string} returns.algorithm - The decryption algorithm used
 * 
 * @example
 * const decrypted = decryptWithAES(encryptedData, aesKey, iv);
 * console.log(decrypted.decryptedText);
 */
function decryptWithAES(encryptedData, aesKey, iv) {
    try {
        // Validate inputs
        if (!encryptedData || !aesKey || !iv) {
            throw new Error('Encrypted data, AES key, and IV are required for decryption');
        }

        if (aesKey.length !== AES_KEY_LENGTH) {
            throw new Error(`AES key must be ${AES_KEY_LENGTH} bytes (256 bits)`);
        }

        if (iv.length !== AES_IV_LENGTH) {
            throw new Error(`IV must be ${AES_IV_LENGTH} bytes (128 bits)`);
        }

        // Create decipher with AES-256-CBC
        const decipher = crypto.createDecipheriv(AES_ALGORITHM, aesKey, iv);

        // Decrypt the data
        let decryptedData = decipher.update(encryptedData);
        decryptedData = Buffer.concat([decryptedData, decipher.final()]);

        return {
            decryptedData: decryptedData,
            decryptedText: decryptedData.toString('utf8'),
            algorithm: AES_ALGORITHM
        };

    } catch (error) {
        throw new Error(`AES decryption failed: ${error.message}`);
    }
}

/**
 * Encrypt AES key using RSA public key encryption
 * 
 * @param {Buffer} aesKey - The 256-bit AES key to encrypt
 * @param {string|Buffer} publicKey - The RSA public key in PEM format
 * @returns {Object} - Object containing encrypted AES key and metadata
 * @returns {Buffer} returns.encryptedAESKey - The RSA-encrypted AES key
 * @returns {string} returns.algorithm - The RSA encryption algorithm used
 * @returns {string} returns.padding - The padding scheme used
 * @returns {string} returns.hash - The hash algorithm used
 * @returns {number} returns.keySize - The size of the encrypted key in bytes
 * 
 * @example
 * const encryptedKey = encryptWithRSA(aesKey, publicKeyPEM);
 * console.log({
 *   encryptedAESKey: encryptedKey.encryptedAESKey.toString('base64'),
 *   keySize: encryptedKey.keySize
 * });
 */
function encryptWithRSA(aesKey, publicKey) {
    try {
        // Validate inputs
        if (!aesKey) {
            throw new Error('AES key is required for RSA encryption');
        }

        if (!publicKey) {
            throw new Error('Public key is required for RSA encryption');
        }

        if (!Buffer.isBuffer(aesKey)) {
            throw new Error('AES key must be a Buffer');
        }

        if (aesKey.length !== AES_KEY_LENGTH) {
            throw new Error(`AES key must be ${AES_KEY_LENGTH} bytes (256 bits)`);
        }

        // Convert public key to string if it's a Buffer
        const publicKeyString = Buffer.isBuffer(publicKey) ? publicKey.toString('utf8') : publicKey;

        // Validate public key format
        if (!publicKeyString.includes('-----BEGIN PUBLIC KEY-----')) {
            throw new Error('Public key must be in PEM format');
        }

        // Encrypt AES key with RSA public key
        const encryptedAESKey = crypto.publicEncrypt({
            key: publicKeyString,
            padding: RSA_PADDING,
            oaepHash: RSA_HASH
        }, aesKey);

        return {
            encryptedAESKey: encryptedAESKey,
            algorithm: 'RSA-OAEP',
            padding: 'RSA_PKCS1_OAEP_PADDING',
            hash: RSA_HASH,
            keySize: encryptedAESKey.length,
            originalKeySize: aesKey.length
        };

    } catch (error) {
        throw new Error(`RSA encryption failed: ${error.message}`);
    }
}

/**
 * Decrypt AES key using RSA private key decryption
 * 
 * @param {Buffer} encryptedAESKey - The RSA-encrypted AES key
 * @param {string|Buffer} privateKey - The RSA private key in PEM format
 * @returns {Object} - Object containing decrypted AES key and metadata
 * @returns {Buffer} returns.decryptedAESKey - The decrypted AES key
 * @returns {string} returns.algorithm - The RSA decryption algorithm used
 * @returns {number} returns.keySize - The size of the decrypted key in bytes
 * 
 * @example
 * const decryptedKey = decryptWithRSA(encryptedAESKey, privateKeyPEM);
 * console.log({
 *   aesKey: decryptedKey.decryptedAESKey.toString('hex'),
 *   keySize: decryptedKey.keySize
 * });
 */
function decryptWithRSA(encryptedAESKey, privateKey) {
    try {
        // Validate inputs
        if (!encryptedAESKey) {
            throw new Error('Encrypted AES key is required for RSA decryption');
        }

        if (!privateKey) {
            throw new Error('Private key is required for RSA decryption');
        }

        if (!Buffer.isBuffer(encryptedAESKey)) {
            throw new Error('Encrypted AES key must be a Buffer');
        }

        // Convert private key to string if it's a Buffer
        const privateKeyString = Buffer.isBuffer(privateKey) ? privateKey.toString('utf8') : privateKey;

        // Validate private key format
        if (!privateKeyString.includes('-----BEGIN PRIVATE KEY-----')) {
            throw new Error('Private key must be in PEM format');
        }

        // Decrypt AES key with RSA private key
        const decryptedAESKey = crypto.privateDecrypt({
            key: privateKeyString,
            padding: RSA_PADDING,
            oaepHash: RSA_HASH
        }, encryptedAESKey);

        return {
            decryptedAESKey: decryptedAESKey,
            algorithm: 'RSA-OAEP',
            keySize: decryptedAESKey.length
        };

    } catch (error) {
        throw new Error(`RSA decryption failed: ${error.message}`);
    }
}

/**
 * Generate RSA key pair for encryption/decryption
 * 
 * @param {number} modulusLength - Key size in bits (default: 2048)
 * @returns {Object} - Object containing public and private keys
 * @returns {string} returns.publicKey - RSA public key in PEM format
 * @returns {string} returns.privateKey - RSA private key in PEM format
 * @returns {number} returns.keySize - Key size in bits
 * 
 * @example
 * const keyPair = generateRSAKeyPair();
 * console.log('Public Key:', keyPair.publicKey);
 * console.log('Private Key:', keyPair.privateKey);
 */
function generateRSAKeyPair(modulusLength = 2048) {
    try {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: modulusLength,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        return {
            publicKey: publicKey,
            privateKey: privateKey,
            keySize: modulusLength
        };

    } catch (error) {
        throw new Error(`RSA key pair generation failed: ${error.message}`);
    }
}

/**
 * Complete hybrid encryption function that combines AES and RSA encryption
 * 
 * @param {string|Buffer} data - The data to encrypt
 * @param {string|Buffer} publicKey - The RSA public key for encrypting AES key
 * @returns {Object} - Complete encryption result
 * @returns {Buffer} returns.encryptedData - AES encrypted data
 * @returns {Buffer} returns.encryptedAESKey - RSA encrypted AES key
 * @returns {Buffer} returns.iv - IV used for AES encryption
 * @returns {Object} returns.metadata - Encryption metadata
 * 
 * @example
 * const result = hybridEncrypt('Sensitive data', publicKey);
 * // Store: result.encryptedData, result.encryptedAESKey, result.iv
 */
function hybridEncrypt(data, publicKey) {
    try {
        // Step 1: Encrypt data with AES
        const aesResult = encryptWithAES(data);

        // Step 2: Encrypt AES key with RSA
        const rsaResult = encryptWithRSA(aesResult.aesKey, publicKey);

        return {
            encryptedData: aesResult.encryptedData,
            encryptedAESKey: rsaResult.encryptedAESKey,
            iv: aesResult.iv,
            metadata: {
                aesAlgorithm: aesResult.algorithm,
                rsaAlgorithm: rsaResult.algorithm,
                timestamp: new Date().toISOString(),
                dataSize: aesResult.encryptedData.length,
                keySize: rsaResult.keySize
            }
        };

    } catch (error) {
        throw new Error(`Hybrid encryption failed: ${error.message}`);
    }
}

/**
 * Complete hybrid decryption function that combines RSA and AES decryption
 * 
 * @param {Buffer} encryptedData - AES encrypted data
 * @param {Buffer} encryptedAESKey - RSA encrypted AES key
 * @param {Buffer} iv - IV used for AES encryption
 * @param {string|Buffer} privateKey - RSA private key for decrypting AES key
 * @returns {Object} - Complete decryption result
 * @returns {Buffer} returns.decryptedData - Original data as Buffer
 * @returns {string} returns.decryptedText - Original data as UTF-8 string
 * @returns {Object} returns.metadata - Decryption metadata
 * 
 * @example
 * const result = hybridDecrypt(encryptedData, encryptedAESKey, iv, privateKey);
 * console.log('Original data:', result.decryptedText);
 */
function hybridDecrypt(encryptedData, encryptedAESKey, iv, privateKey) {
    try {
        // Step 1: Decrypt AES key with RSA
        const rsaResult = decryptWithRSA(encryptedAESKey, privateKey);

        // Step 2: Decrypt data with AES
        const aesResult = decryptWithAES(encryptedData, rsaResult.decryptedAESKey, iv);

        return {
            decryptedData: aesResult.decryptedData,
            decryptedText: aesResult.decryptedText,
            metadata: {
                aesAlgorithm: aesResult.algorithm,
                rsaAlgorithm: rsaResult.algorithm,
                timestamp: new Date().toISOString(),
                keySize: rsaResult.keySize
            }
        };

    } catch (error) {
        throw new Error(`Hybrid decryption failed: ${error.message}`);
    }
}

/**
 * Hash data using SHA-256
 * 
 * @param {string|Buffer} data - Data to hash
 * @returns {Object} - Hash result
 * @returns {Buffer} returns.hash - The hash as Buffer
 * @returns {string} returns.hashHex - The hash as hexadecimal string
 * @returns {string} returns.hashBase64 - The hash as base64 string
 * @returns {string} returns.algorithm - Hash algorithm used
 */
function hashSHA256(data) {
    try {
        const hash = crypto.createHash('sha256');
        hash.update(data);
        const hashBuffer = hash.digest();

        return {
            hash: hashBuffer,
            hashHex: hashBuffer.toString('hex'),
            hashBase64: hashBuffer.toString('base64'),
            algorithm: 'sha256'
        };

    } catch (error) {
        throw new Error(`SHA-256 hashing failed: ${error.message}`);
    }
}

/**
 * Generate RSA key pair for new user registration
 * Creates a key pair specifically for encrypting user data
 * 
 * @returns {Object} - Object containing public and private keys for storage
 * @returns {string} returns.publicKey - RSA public key in PEM format
 * @returns {string} returns.privateKey - RSA private key in PEM format
 * @returns {number} returns.keySize - Key size in bits (2048)
 */
function generateUserKeyPair() {
    try {
        const keyPair = generateRSAKeyPair(2048);
        
        return {
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            keySize: keyPair.keySize,
            createdAt: new Date().toISOString()
        };

    } catch (error) {
        throw new Error(`User key pair generation failed: ${error.message}`);
    }
}

/**
 * Encrypt user data (complaints, messages) for database storage
 * Uses hybrid encryption (AES + RSA) for secure storage
 * 
 * @param {string} plaintext - The data to encrypt
 * @param {string} publicKey - User's RSA public key in PEM format
 * @returns {Object} - Encrypted data package for database storage
 * @returns {string} returns.encryptedData - Base64 encoded encrypted data
 * @returns {string} returns.encryptedKey - Base64 encoded encrypted AES key
 * @returns {string} returns.iv - Base64 encoded initialization vector
 * @returns {Object} returns.metadata - Encryption metadata
 */
function encryptUserData(plaintext, publicKey) {
    try {
        if (!plaintext || !publicKey) {
            throw new Error('Plaintext and public key are required');
        }

        const result = hybridEncrypt(plaintext, publicKey);

        return {
            encryptedData: result.encryptedData.toString('base64'),
            encryptedKey: result.encryptedAESKey.toString('base64'),
            iv: result.iv.toString('base64'),
            metadata: {
                ...result.metadata,
                encryptedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        throw new Error(`User data encryption failed: ${error.message}`);
    }
}

/**
 * Decrypt user data retrieved from database
 * Uses hybrid decryption (RSA + AES) to restore original data
 * 
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} encryptedKey - Base64 encoded encrypted AES key
 * @param {string} iv - Base64 encoded initialization vector
 * @param {string} privateKey - User's RSA private key in PEM format
 * @returns {Object} - Decrypted data result
 * @returns {string} returns.plaintext - The original decrypted text
 * @returns {Object} returns.metadata - Decryption metadata
 */
function decryptUserData(encryptedData, encryptedKey, iv, privateKey) {
    try {
        if (!encryptedData || !encryptedKey || !iv || !privateKey) {
            throw new Error('All encryption components and private key are required');
        }

        // Convert base64 strings back to buffers
        const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
        const encryptedKeyBuffer = Buffer.from(encryptedKey, 'base64');
        const ivBuffer = Buffer.from(iv, 'base64');

        const result = hybridDecrypt(encryptedDataBuffer, encryptedKeyBuffer, ivBuffer, privateKey);

        return {
            plaintext: result.decryptedText,
            metadata: {
                ...result.metadata,
                decryptedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        throw new Error(`User data decryption failed: ${error.message}`);
    }
}

// Export all functions
module.exports = {
    // Primary functions as requested
    encryptWithAES,
    encryptWithRSA,
    
    // Additional utility functions
    decryptWithAES,
    decryptWithRSA,
    generateRSAKeyPair,
    hybridEncrypt,
    hybridDecrypt,
    hashSHA256,
    
    // User-specific encryption functions
    generateUserKeyPair,
    encryptUserData,
    decryptUserData,
    
    // Helper functions
    generateAESKey,
    generateIV,
    generateRandomBuffer,
    
    // Constants
    AES_ALGORITHM,
    AES_KEY_LENGTH,
    AES_IV_LENGTH,
    RSA_PADDING,
    RSA_HASH
};