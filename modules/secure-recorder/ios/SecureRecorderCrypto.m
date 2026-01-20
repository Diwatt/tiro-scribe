//
//  SecureRecorderCrypto.m
//  Secure Recorder Module
//
//  Objective-C wrapper for CommonCrypto streaming GCM encryption
//

#import <Foundation/Foundation.h>
#import <CommonCrypto/CommonCrypto.h>

CCCryptorRef createGCMEncryptor(const void *key, size_t keyLength, const void *iv, size_t ivLength) {
    CCCryptorRef cryptor = NULL;
    CCCryptorStatus status = CCCryptorCreateWithMode(
        kCCEncrypt,
        kCCModeGCM,
        kCCAlgorithmAES,
        ccNoPadding,
        iv,
        key,
        keyLength,
        NULL, 0, 0,
        kCCModeOptionCTR_BE,
        &cryptor
    );
    
    if (status != kCCSuccess) {
        return NULL;
    }
    
    return cryptor;
}

CCCryptorStatus updateGCMEncryptor(CCCryptorRef cryptor, const void *dataIn, size_t dataInLength, void *dataOut, size_t dataOutAvailable, size_t *dataOutMoved) {
    return CCCryptorUpdate(cryptor, dataIn, dataInLength, dataOut, dataOutAvailable, dataOutMoved);
}

CCCryptorStatus finalizeGCMEncryptor(CCCryptorRef cryptor, void *dataOut, size_t dataOutAvailable, size_t *dataOutMoved) {
    return CCCryptorFinal(cryptor, dataOut, dataOutAvailable, dataOutMoved);
}

void releaseGCMEncryptor(CCCryptorRef cryptor) {
    CCCryptorRelease(cryptor);
}
