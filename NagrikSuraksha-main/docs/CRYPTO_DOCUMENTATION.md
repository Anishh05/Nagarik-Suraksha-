# Cryptographic Utilities Documentation

This documentation covers the `crypto.js` module which provides secure encryption functions using AES and RSA algorithms with Node.js built-in crypto module.

## Overview

The crypto utilities module provides:

- **AES-256-CBC Encryption**: Symmetric encryption for data
- **RSA-OAEP Encryption**: Asymmetric encryption for keys
- **Hybrid Encryption**: Combines AES and RSA for optimal security and performance
- **SHA-256 Hashing**: Secure hashing functionality
- **Key Generation**: RSA key pair and AES key generation

## Core Functions

### 1. `encryptWithAES(data)`

Encrypts data using AES-256-CBC with randomly generated 256-bit key and 128-bit IV.

**Parameters:**
- `data` (string|Buffer): The data to encrypt

**Returns:**
```javascript
{
  encryptedData: Buffer,     // The encrypted data
  aesKey: Buffer,           // 256-bit AES key (32 bytes)
  iv: Buffer,               // 128-bit IV (16 bytes)
  algorithm: string,        // 'aes-256-cbc'
  keyLength: number,        // 256 (bits)
  ivLength: number          // 128 (bits)
}
```

**Example:**
```javascript
const crypto = require('./crypto');

const result = crypto.encryptWithAES('Hello, World!');
console.log('Encrypted:', result.encryptedData.toString('base64'));
console.log('AES Key:', result.aesKey.toString('hex'));
console.log('IV:', result.iv.toString('hex'));
```

### 2. `encryptWithRSA(aesKey, publicKey)`

Encrypts an AES key using RSA public key encryption with OAEP padding.

**Parameters:**
- `aesKey` (Buffer): The 256-bit AES key to encrypt (32 bytes)
- `publicKey` (string|Buffer): RSA public key in PEM format

**Returns:**
```javascript
{
  encryptedAESKey: Buffer,  // RSA-encrypted AES key
  algorithm: string,        // 'RSA-OAEP'
  padding: string,          // 'RSA_PKCS1_OAEP_PADDING'
  hash: string,             // 'sha256'
  keySize: number,          // Size of encrypted key in bytes
  originalKeySize: number   // Size of original key (32 bytes)
}
```

**Example:**
```javascript
const crypto = require('./crypto');

// Generate RSA key pair
const keyPair = crypto.generateRSAKeyPair();

// Generate AES key
const aesKey = crypto.generateAESKey();

// Encrypt AES key with RSA public key
const result = crypto.encryptWithRSA(aesKey, keyPair.publicKey);
console.log('Encrypted AES Key:', result.encryptedAESKey.toString('base64'));
```

## Additional Functions

### 3. `decryptWithAES(encryptedData, aesKey, iv)`

Decrypts AES-encrypted data.

**Parameters:**
- `encryptedData` (Buffer): The encrypted data
- `aesKey` (Buffer): The 256-bit AES key
- `iv` (Buffer): The 128-bit IV

**Returns:**
```javascript
{
  decryptedData: Buffer,    // Decrypted data as Buffer
  decryptedText: string,    // Decrypted data as UTF-8 string
  algorithm: string         // 'aes-256-cbc'
}
```

### 4. `decryptWithRSA(encryptedAESKey, privateKey)`

Decrypts RSA-encrypted AES key.

**Parameters:**
- `encryptedAESKey` (Buffer): The RSA-encrypted AES key
- `privateKey` (string|Buffer): RSA private key in PEM format

**Returns:**
```javascript
{
  decryptedAESKey: Buffer,  // The decrypted AES key
  algorithm: string,        // 'RSA-OAEP'
  keySize: number          // Size of decrypted key in bytes
}
```

### 5. `generateRSAKeyPair(modulusLength = 2048)`

Generates RSA key pair for encryption/decryption.

**Parameters:**
- `modulusLength` (number): Key size in bits (default: 2048)

**Returns:**
```javascript
{
  publicKey: string,   // RSA public key in PEM format
  privateKey: string,  // RSA private key in PEM format
  keySize: number     // Key size in bits
}
```

### 6. `hybridEncrypt(data, publicKey)`

Complete hybrid encryption combining AES and RSA.

**Parameters:**
- `data` (string|Buffer): Data to encrypt
- `publicKey` (string|Buffer): RSA public key

**Returns:**
```javascript
{
  encryptedData: Buffer,     // AES encrypted data
  encryptedAESKey: Buffer,   // RSA encrypted AES key
  iv: Buffer,                // IV for AES decryption
  metadata: {
    aesAlgorithm: string,
    rsaAlgorithm: string,
    timestamp: string,
    dataSize: number,
    keySize: number
  }
}
```

### 7. `hybridDecrypt(encryptedData, encryptedAESKey, iv, privateKey)`

Complete hybrid decryption.

**Parameters:**
- `encryptedData` (Buffer): AES encrypted data
- `encryptedAESKey` (Buffer): RSA encrypted AES key
- `iv` (Buffer): IV used for AES encryption
- `privateKey` (string|Buffer): RSA private key

**Returns:**
```javascript
{
  decryptedData: Buffer,    // Original data as Buffer
  decryptedText: string,    // Original data as UTF-8 string
  metadata: {
    aesAlgorithm: string,
    rsaAlgorithm: string,
    timestamp: string,
    keySize: number
  }
}
```

### 8. `hashSHA256(data)`

Hash data using SHA-256.

**Parameters:**
- `data` (string|Buffer): Data to hash

**Returns:**
```javascript
{
  hash: Buffer,         // Hash as Buffer
  hashHex: string,      // Hash as hexadecimal string
  hashBase64: string,   // Hash as base64 string
  algorithm: string     // 'sha256'
}
```

## Utility Functions

### Helper Functions
- `generateAESKey()`: Generate 256-bit AES key
- `generateIV()`: Generate 128-bit IV
- `generateRandomBuffer(length)`: Generate random buffer

### Constants
- `AES_ALGORITHM`: 'aes-256-cbc'
- `AES_KEY_LENGTH`: 32 bytes (256 bits)
- `AES_IV_LENGTH`: 16 bytes (128 bits)
- `RSA_PADDING`: RSA_PKCS1_OAEP_PADDING
- `RSA_HASH`: 'sha256'

## Complete Usage Example

```javascript
const crypto = require('./crypto');

async function completeEncryptionExample() {
  try {
    // 1. Generate RSA key pair
    const keyPair = crypto.generateRSAKeyPair(2048);
    console.log('Generated RSA key pair');

    // 2. Original data to encrypt
    const originalData = 'This is highly sensitive information that needs encryption!';
    console.log('Original:', originalData);

    // 3. Method 1: Manual step-by-step encryption
    console.log('\n--- Manual Encryption ---');
    
    // Encrypt data with AES
    const aesResult = crypto.encryptWithAES(originalData);
    console.log('AES encrypted data size:', aesResult.encryptedData.length);
    
    // Encrypt AES key with RSA
    const rsaResult = crypto.encryptWithRSA(aesResult.aesKey, keyPair.publicKey);
    console.log('RSA encrypted key size:', rsaResult.encryptedAESKey.length);

    // Decrypt AES key with RSA
    const decryptedKeyResult = crypto.decryptWithRSA(rsaResult.encryptedAESKey, keyPair.privateKey);
    
    // Decrypt data with AES
    const decryptedDataResult = crypto.decryptWithAES(
      aesResult.encryptedData, 
      decryptedKeyResult.decryptedAESKey, 
      aesResult.iv
    );
    
    console.log('Decrypted:', decryptedDataResult.decryptedText);
    console.log('Match:', decryptedDataResult.decryptedText === originalData);

    // 4. Method 2: Hybrid encryption (recommended)
    console.log('\n--- Hybrid Encryption ---');
    
    const hybridEncrypted = crypto.hybridEncrypt(originalData, keyPair.publicKey);
    console.log('Hybrid encryption metadata:', hybridEncrypted.metadata);
    
    const hybridDecrypted = crypto.hybridDecrypt(
      hybridEncrypted.encryptedData,
      hybridEncrypted.encryptedAESKey,
      hybridEncrypted.iv,
      keyPair.privateKey
    );
    
    console.log('Hybrid decrypted:', hybridDecrypted.decryptedText);
    console.log('Match:', hybridDecrypted.decryptedText === originalData);

    // 5. Hash the original data
    const hash = crypto.hashSHA256(originalData);
    console.log('\nSHA-256 Hash:', hash.hashHex);

  } catch (error) {
    console.error('Encryption example failed:', error.message);
  }
}

// Run the example
completeEncryptionExample();
```

## Security Considerations

### Encryption Specifications
- **AES**: 256-bit key, CBC mode with 128-bit IV
- **RSA**: 2048-bit keys (minimum), OAEP padding with SHA-256
- **Random Generation**: Cryptographically secure random number generation

### Best Practices
1. **Key Management**: Store private keys securely, never expose in logs
2. **IV Uniqueness**: Always use fresh IVs for each encryption
3. **Key Size**: Use minimum 2048-bit RSA keys (4096-bit recommended for high security)
4. **Error Handling**: Implement proper error handling for all crypto operations
5. **Secure Storage**: Encrypt private keys before database storage
6. **Transport Security**: Always use HTTPS for key exchange

### Production Recommendations
1. Use Hardware Security Modules (HSM) for key storage
2. Implement key rotation policies
3. Add integrity checks (HMAC) to encrypted data
4. Use secure key derivation functions (PBKDF2, scrypt, Argon2)
5. Implement proper access controls and audit logging
6. Regular security audits and vulnerability assessments

## Testing

Run the test suite to verify functionality:

```bash
node crypto-test.js
```

The test suite includes:
- AES encryption/decryption tests
- RSA encryption/decryption tests
- Hybrid encryption tests
- SHA-256 hashing tests
- Error handling validation
- Performance benchmarks

## Error Handling

All functions include comprehensive error handling:

```javascript
try {
  const result = crypto.encryptWithAES(data);
  console.log('Success:', result);
} catch (error) {
  console.error('Encryption failed:', error.message);
  // Handle specific error cases
  if (error.message.includes('Data to encrypt cannot be empty')) {
    // Handle empty data error
  }
}
```

Common error scenarios:
- Empty or invalid input data
- Invalid key formats or lengths
- Malformed public/private keys
- Corrupted encrypted data
- Insufficient entropy for random generation

## Performance Characteristics

### AES Encryption
- Very fast for large data (symmetric encryption)
- Suitable for encrypting files, messages, database fields
- Linear performance scaling with data size

### RSA Encryption
- Slower for large data (asymmetric encryption)
- Primarily used for encrypting small data (like AES keys)
- Performance decreases with larger key sizes

### Hybrid Approach Benefits
- Combines speed of AES with security of RSA
- Optimal for large data encryption
- Industry standard approach for secure communications