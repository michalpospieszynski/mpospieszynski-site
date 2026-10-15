package pl.mpospieszynski.site.shared.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** The signed-in admin's access token, forwarded to Supabase Storage so its policies apply to uploads. */
public final class CurrentAdmin {

    private CurrentAdmin() {
    }

    /** The raw bearer token of the current request, or null outside an authenticated admin request. */
    public static String accessToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication instanceof JwtAuthenticationToken jwt ? jwt.getToken().getTokenValue() : null;
    }
}
