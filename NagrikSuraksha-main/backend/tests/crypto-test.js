/**
 * Test file for crypto.js utilities
 * 
 * This file demonstrates how to use the cryptographic functions
 * and provides examples for testing the implementation.
 */

const crypto = require('./crypto');

/**
 * Test AES encryption and decryption
 */
function testAESEncryption() {
    console.log('\n=== Testing AES Encryption ===');
    
    try {
        const originalData = 'This is sensitive data that needs to be encrypted securely!';
        console.log('Original data:', originalData);
        
        // Encrypt with AES
        const encrypted = crypto.encryptWithAES(originalData);
        console.log('\nAES Encryption Result:');
        console.log('- Algorithm:', encrypted.algorithm);
        console.log('- Key length:', encrypted.keyLength, 'bits');
        console.log('- IV length:', encrypted.ivLength, 'bits');
        console.log('- Encrypted data (base64):', encrypted.encryptedData.toString('base64'));
        console.log('- AES Key (hex):', encrypted.aesKey.toString('hex'));
        console.log('- IV (hex):', encrypted.iv.toString('hex'));
        
        // Decrypt with AES
        const decrypted = crypto.decryptWithAES(encrypted.encryptedData, encrypted.aesKey, encrypted.iv);
        console.log('\nAES Decryption Result:');
        console.log('- Decrypted text:', decrypted.decryptedText);
        console.log('- Match original:', decrypted.decryptedText === originalData);
        
        return { encrypted, decrypted, success: true };
        
    } catch (error) {
        console.error('AES test failed:', error.message);
        return { success: false, error };
    }
}

/**
 * Test RSA encryption and decryption
 */
function testRSAEncryption() {
    console.log('\n=== Testing RSA Encryption ===');
    
    try {
        // Generate RSA key pair
        const keyPair = crypto.generateRSAKeyPair(2048);
        console.log('RSA Key Pair Generated:');
        console.log('- Key size:', keyPair.keySize, 'bits');
        console.log('- Public key preview:', keyPair.publicKey.substring(0, 100) + '...');
        console.log('- Private key preview:', keyPair.privateKey.substring(0, 100) + '...');
        
        // Generate AES key to encrypt
        const aesKey = crypto.generateAESKey();
        console.log('\nAES Key to encrypt (hex):', aesKey.toString('hex'));
        
        // Encrypt AES key with RSA
        const encryptedKey = crypto.encryptWithRSA(aesKey, keyPair.publicKey);
        console.log('\nRSA Encryption Result:');
        console.log('- Algorithm:', encryptedKey.algorithm);
        console.log('- Padding:', encryptedKey.padding);
        console.log('- Hash:', encryptedKey.hash);
        console.log('- Encrypted key size:', encryptedKey.keySize, 'bytes');
        console.log('- Encrypted AES key (base64):', encryptedKey.encryptedAESKey.toString('base64'));
        
        // Decrypt AES key with RSA
        const decryptedKey = crypto.decryptWithRSA(encryptedKey.encryptedAESKey, keyPair.privateKey);
        console.log('\nRSA Decryption Result:');
        console.log('- Decrypted key (hex):', decryptedKey.decryptedAESKey.toString('hex'));
        console.log('- Key size:', decryptedKey.keySize, 'bytes');
        console.log('- Match original:', aesKey.equals(decryptedKey.decryptedAESKey));
        
        return { keyPair, aesKey, encryptedKey, decryptedKey, success: true };
        
    } catch (error) {
        console.error('RSA test failed:', error.message);
        return { success: false, error };
    }
}

/**
 * Test hybrid encryption (AES + RSA)
 */
function testHybridEncryption() {
    console.log('\n=== Testing Hybrid Encryption ===');
    
    try {
        const originalData = 'This is a large amount of sensitive data that will be encrypted using hybrid encryption. ' +
                           'The data is encrypted with AES for speed, and the AES key is encrypted with RSA for security. ' +
                           'This approach combines the benefits of both symmetric and asymmetric encryption.';
        
        console.log('Original data length:', originalData.length, 'characters');
        console.log('Original data preview:', originalData.substring(0, 100) + '...');
        
        // Generate RSA key pair
        const keyPair = crypto.generateRSAKeyPair(2048);
        
        // Hybrid encryption
        const encrypted = crypto.hybridEncrypt(originalData, keyPair.publicKey);
        console.log('\nHybrid Encryption Result:');
        console.log('- Encrypted data size:', encrypted.encryptedData.length, 'bytes');
        console.log('- Encrypted AES key size:', encrypted.encryptedAESKey.length, 'bytes');
        console.log('- IV size:', encrypted.iv.length, 'bytes');
        console.log('- Metadata:', encrypted.metadata);
        
        // Hybrid decryption
        const decrypted = crypto.hybridDecrypt(
            encrypted.encryptedData,
            encrypted.encryptedAESKey,
            encrypted.iv,
            keyPair.privateKey
        );
        
        console.log('\nHybrid Decryption Result:');
        console.log('- Decrypted data length:', decrypted.decryptedText.length, 'characters');
        console.log('- Decrypted data preview:', decrypted.decryptedText.substring(0, 100) + '...');
        console.log('- Match original:', decrypted.decryptedText === originalData);
        console.log('- Metadata:', decrypted.metadata);
        
        return { encrypted, decrypted, success: true };
        
    } catch (error) {
        console.error('Hybrid encryption test failed:', error.message);
        return { success: false, error };
    }
}

/**
 * Test SHA-256 hashing
 */
function testSHA256() {
    console.log('\n=== Testing SHA-256 Hashing ===');
    
    try {
        const data = 'This data will be hashed with SHA-256';
        console.log('Original data:', data);
        
        const hashed = crypto.hashSHA256(data);
        console.log('\nSHA-256 Hash Result:');
        console.log('- Algorithm:', hashed.algorithm);
        console.log('- Hash (hex):', hashed.hashHex);
        console.log('- Hash (base64):', hashed.hashBase64);
        console.log('- Hash length:', hashed.hash.length, 'bytes');
        
        // Test consistency
        const hashed2 = crypto.hashSHA256(data);
        console.log('- Consistent hashing:', hashed.hashHex === hashed2.hashHex);
        
        return { hashed, success: true };
        
    } catch (error) {
        console.error('SHA-256 test failed:', error.message);
        return { success: false, error };
    }
}

/**
 * Test error handling
 */
function testErrorHandling() {
    console.log('\n=== Testing Error Handling ===');
    
    const tests = [
        {
            name: 'Empty data for AES encryption',
            test: () => crypto.encryptWithAES('')
        },
        {
            name: 'Invalid public key for RSA encryption',
            test: () => crypto.encryptWithRSA(crypto.generateAESKey(), 'invalid-key')
        },
        {
            name: 'Wrong key length for AES decryption',
            test: () => crypto.decryptWithAES(Buffer.from('test'), Buffer.from('short'), crypto.generateIV())
        },
        {
            name: 'Invalid encrypted data for RSA decryption',
            test: () => {
                const keyPair = crypto.generateRSAKeyPair();
                return crypto.decryptWithRSA(Buffer.from('invalid'), keyPair.privateKey);
            }
        }
    ];
    
    tests.forEach(({ name, test }) => {
        try {
            test();
            console.log(`❌ ${name}: Should have thrown an error`);
        } catch (error) {
            console.log(`✅ ${name}: Correctly threw error - ${error.message}`);
        }
    });
}

/**
 * Performance benchmark
 */
function benchmarkPerformance() {
    console.log('\n=== Performance Benchmark ===');
    
    try {
        const testData = 'A'.repeat(10000); // 10KB of data
        const keyPair = crypto.generateRSAKeyPair();
        
        // AES encryption benchmark
        const aesStart = process.hrtime.bigint();
        for (let i = 0; i < 100; i++) {
            crypto.encryptWithAES(testData);
        }
        const aesEnd = process.hrtime.bigint();
        const aesTime = Number(aesEnd - aesStart) / 1000000; // Convert to milliseconds
        
        // RSA encryption benchmark
        const aesKey = crypto.generateAESKey();
        const rsaStart = process.hrtime.bigint();
        for (let i = 0; i < 100; i++) {
            crypto.encryptWithRSA(aesKey, keyPair.publicKey);
        }
        const rsaEnd = process.hrtime.bigint();
        const rsaTime = Number(rsaEnd - rsaStart) / 1000000; // Convert to milliseconds
        
        console.log(`AES encryption (100x 10KB): ${aesTime.toFixed(2)}ms (avg: ${(aesTime/100).toFixed(2)}ms per operation)`);
        console.log(`RSA encryption (100x 32B): ${rsaTime.toFixed(2)}ms (avg: ${(rsaTime/100).toFixed(2)}ms per operation)`);
        console.log(`Performance ratio (RSA/AES): ${(rsaTime/aesTime).toFixed(2)}x slower`);
        
    } catch (error) {
        console.error('Benchmark failed:', error.message);
    }
}

/**
 * Run all tests
 */
function runAllTests() {
    console.log('🔐 Crypto.js Utilities Test Suite');
    console.log('================================');
    
    const results = {
        aes: testAESEncryption(),
        rsa: testRSAEncryption(),
        hybrid: testHybridEncryption(),
        hash: testSHA256()
    };
    
    testErrorHandling();
    benchmarkPerformance();
    
    console.log('\n=== Test Summary ===');
    Object.entries(results).forEach(([test, result]) => {
        console.log(`${result.success ? '✅' : '❌'} ${test.toUpperCase()}: ${result.success ? 'PASSED' : 'FAILED'}`);
        if (!result.success) {
            console.log(`   Error: ${result.error.message}`);
        }
    });
    
    const allPassed = Object.values(results).every(r => r.success);
    console.log(`\n🎯 Overall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
}

// Export test functions for individual testing
module.exports = {
    testAESEncryption,
    testRSAEncryption,
    testHybridEncryption,
    testSHA256,
    testErrorHandling,
    benchmarkPerformance,
    runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}