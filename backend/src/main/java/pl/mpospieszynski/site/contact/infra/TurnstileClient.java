package pl.mpospieszynski.site.contact.infra;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Cloudflare Turnstile server-side check (`siteverify`). Dev and tests use Cloudflare's test secret, which
 * accepts any token; production sets TURNSTILE_SECRET_KEY.
 */
@Component
public class TurnstileClient {

    private static final Logger log = LoggerFactory.getLogger(TurnstileClient.class);

    record VerifyResponse(boolean success) {
    }

    private final RestClient http;
    private final String secret;

    public TurnstileClient(@Value("${site.turnstile.secret-key}") String secret,
                           @Value("${site.turnstile.verify-url}") String verifyUrl) {
        this.http = RestClient.builder().baseUrl(verifyUrl).build();
        this.secret = secret;
    }

    /** False when the token is missing, invalid, or Cloudflare can't be reached (fail closed). */
    public boolean verify(String token, String remoteIp) {
        if (token == null || token.isBlank()) {
            return false;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secret);
        form.add("response", token);
        form.add("remoteip", remoteIp);
        try {
            VerifyResponse response = http.post()
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(VerifyResponse.class);
            return response != null && response.success();
        } catch (RestClientException e) {
            log.warn("Turnstile verification failed: {}", e.getMessage());
            return false;
        }
    }
}
