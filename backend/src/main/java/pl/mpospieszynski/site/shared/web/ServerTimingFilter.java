package pl.mpospieszynski.site.shared.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * Adds `Server-Timing: app;dur=…, db;dur=…` (plus `cache;desc=hit`) to API responses; the home page's
 * "how this page was served" panel reads it. The body is buffered so the header can be set once the
 * total is known, which is fine for JSON; media streams are excluded.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
class ServerTimingFilter extends OncePerRequestFilter {

    static final String HEADER = "Server-Timing";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long start = System.nanoTime();
        RequestTimings timings = RequestTimings.start();
        ContentCachingResponseWrapper buffered = new ContentCachingResponseWrapper(response);
        try {
            chain.doFilter(request, buffered);
        } finally {
            buffered.setHeader(HEADER, header(System.nanoTime() - start, timings));
            RequestTimings.end();
            buffered.copyBodyToResponse();
        }
    }

    static String header(long appNanos, RequestTimings timings) {
        String value = String.format(Locale.ROOT, "app;dur=%.1f, db;dur=%.1f", millis(appNanos), millis(timings.dbNanos()));
        return timings.cacheHit() ? value + ", cache;desc=hit" : value;
    }

    private static double millis(long nanos) {
        return nanos / 1_000_000.0;
    }
}
