package pl.mpospieszynski.site.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * The visitor's IP. Cloudflare sets CF-Connecting-IP; it can be trusted because the API is reachable only
 * through the tunnel. Without the header (local development) the socket address is used.
 */
@Component
public class ClientIpResolver {

    static final String CF_CONNECTING_IP = "CF-Connecting-IP";

    public String resolve(HttpServletRequest request) {
        String header = request.getHeader(CF_CONNECTING_IP);
        return header != null && !header.isBlank() ? header.strip() : request.getRemoteAddr();
    }
}
