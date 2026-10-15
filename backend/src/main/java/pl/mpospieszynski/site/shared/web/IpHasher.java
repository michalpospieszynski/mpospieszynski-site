package pl.mpospieszynski.site.shared.web;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Salted hash (HMAC-SHA256) of a visitor's IP. Only the hash is stored, for rate limiting and spam
 * analysis; without the salt (IP_HASH_SALT) the original address cannot be recovered by brute force.
 */
@Component
public class IpHasher {

    private final SecretKeySpec key;

    public IpHasher(@Value("${site.privacy.ip-hash-salt}") String salt) {
        if (salt == null || salt.isBlank()) {
            throw new IllegalStateException("site.privacy.ip-hash-salt (IP_HASH_SALT) must be set");
        }
        this.key = new SecretKeySpec(salt.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public String hash(String ip) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return HexFormat.of().formatHex(mac.doFinal(ip.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }
}
