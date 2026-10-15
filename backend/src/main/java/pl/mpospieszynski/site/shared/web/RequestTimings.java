package pl.mpospieszynski.site.shared.web;

/**
 * Per-request timing collected for the Server-Timing header: database time (from the datasource proxy)
 * and whether a cached response was served. A request runs on one (virtual) thread, so a ThreadLocal
 * holds it; outside a request (startup, scheduled jobs) every call is a no-op.
 */
public final class RequestTimings {

    private static final ThreadLocal<RequestTimings> CURRENT = new ThreadLocal<>();

    private long dbNanos;
    private boolean cacheHit;

    private RequestTimings() {
    }

    static RequestTimings start() {
        RequestTimings timings = new RequestTimings();
        CURRENT.set(timings);
        return timings;
    }

    static void end() {
        CURRENT.remove();
    }

    /** Called by the datasource proxy after each statement. */
    public static void addDatabaseTime(long nanos) {
        RequestTimings timings = CURRENT.get();
        if (timings != null) {
            timings.dbNanos += nanos;
        }
    }

    /** Called by the cache layer when a public read is served from cache. */
    public static void markCacheHit() {
        RequestTimings timings = CURRENT.get();
        if (timings != null) {
            timings.cacheHit = true;
        }
    }

    long dbNanos() {
        return dbNanos;
    }

    boolean cacheHit() {
        return cacheHit;
    }
}
