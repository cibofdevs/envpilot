package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class MfaService {

    @Autowired
    private UserRepository userRepository;

    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    public Map<String, Object> generateMfaSecret(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate new secret
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        String secret = key.getKey();

        // Save secret to user (not enabled yet)
        user.setMfaSecret(secret);
        user.setMfaEnabled(false);
        user.setMfaSetupCompleted(false);
        userRepository.save(user);

        // URL encode the issuer and account name to handle special characters
        String issuer = "EnvPilot";
        String accountName = email;
        
        String qrCodeUrl = String.format(
                "otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                issuer,
                accountName,
                secret,
                issuer
        );

        Map<String, Object> result = new HashMap<>();
        result.put("secret", secret);
        result.put("qrCodeUrl", qrCodeUrl);
        result.put("backupCodes", generateBackupCodes());

        return result;
    }

    public boolean verifyMfaCode(String email, int code) {
        System.out.println("MfaService.verifyMfaCode called with email: " + email + ", code: " + code);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        System.out.println("User found in MfaService: " + user.getName());
        System.out.println("User MFA secret: " + (user.getMfaSecret() != null ? user.getMfaSecret() : "null"));

        if (user.getMfaSecret() == null) {
            System.out.println("MFA secret is null, returning false");
            return false;
        }

        boolean result = gAuth.authorize(user.getMfaSecret(), code);
        System.out.println("GoogleAuthenticator.authorize result: " + result);

        return result;
    }

    public boolean enableMfa(String email, int code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getMfaSecret() == null) {
            return false;
        }

        // Verify the code first
        if (!gAuth.authorize(user.getMfaSecret(), code)) {
            return false;
        }

        // Enable MFA
        user.setMfaEnabled(true);
        user.setMfaSetupCompleted(true);
        userRepository.save(user);

        return true;
    }

    public boolean disableMfa(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setMfaEnabled(false);
        user.setMfaSetupCompleted(false);
        user.setMfaSecret(null);
        userRepository.save(user);

        return true;
    }

    public boolean isMfaEnabled(String email) {
        User user = userRepository.findByEmail(email)
                .orElse(null);

        return user != null && Boolean.TRUE.equals(user.getMfaEnabled());
    }

    public boolean isMfaSetupCompleted(String email) {
        User user = userRepository.findByEmail(email)
                .orElse(null);

        return user != null && Boolean.TRUE.equals(user.getMfaSetupCompleted());
    }

    private String[] generateBackupCodes() {
        // Generate 8 backup codes, each 8 characters long
        String[] backupCodes = new String[8];
        for (int i = 0; i < 8; i++) {
            backupCodes[i] = generateRandomCode(8);
        }
        return backupCodes;
    }

    private String generateRandomCode(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            int index = (int) (Math.random() * chars.length());
            sb.append(chars.charAt(index));
        }
        return sb.toString();
    }
}