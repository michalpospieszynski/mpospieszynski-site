package pl.mpospieszynski.site.shared.cache;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import pl.mpospieszynski.site.shared.web.RequestTimings;

/**
 * Public reads are cached in Caffeine per language and filters (`@Cacheable` with `lang` in the key), which
 * hides the network distance to Supabase. A cache hit is reported in Server-Timing as `cache;desc=hit`.
 */
@Configuration
@EnableCaching
class CacheConfig {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    @Bean
    CacheManager cacheManager() {
        CaffeineCacheManager caffeine = new CaffeineCacheManager();
        // Admin writes clear the caches; the expiry is only a safety net.
        caffeine.setCaffeine(Caffeine.newBuilder().maximumSize(1_000).expireAfterWrite(Duration.ofMinutes(30)));
        return new TimingCacheManager(caffeine);
    }

    @Bean
    PublicCacheEviction publicCacheEviction(CacheManager cacheManager) {
        return new PublicCacheEviction(cacheManager);
    }

    /** Clears every cache once an admin write has committed (or immediately when published outside a transaction). */
    static class PublicCacheEviction {

        private final CacheManager cacheManager;

        PublicCacheEviction(CacheManager cacheManager) {
            this.cacheManager = cacheManager;
        }

        @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
        void onContentChanged(ContentChangedEvent event) {
            cacheManager.getCacheNames().forEach(name -> {
                Cache cache = cacheManager.getCache(name);
                if (cache != null) {
                    cache.clear();
                }
            });
            log.debug("Public caches cleared after a change in {}", event.source());
        }
    }

    static final class TimingCacheManager implements CacheManager {

        private final CacheManager delegate;
        private final Map<String, Cache> caches = new ConcurrentHashMap<>();

        TimingCacheManager(CacheManager delegate) {
            this.delegate = delegate;
        }

        @Override
        public Cache getCache(String name) {
            return caches.computeIfAbsent(name, n -> {
                Cache cache = delegate.getCache(n);
                return cache == null ? null : new TimingCache(cache);
            });
        }

        @Override
        public Collection<String> getCacheNames() {
            return delegate.getCacheNames();
        }
    }

    /** Delegating cache that marks the current request as served from cache on a hit. */
    static final class TimingCache implements Cache {

        private final Cache delegate;

        TimingCache(Cache delegate) {
            this.delegate = delegate;
        }

        @Override
        public String getName() {
            return delegate.getName();
        }

        @Override
        public Object getNativeCache() {
            return delegate.getNativeCache();
        }

        @Override
        public ValueWrapper get(Object key) {
            return hit(delegate.get(key));
        }

        @Override
        public <T> T get(Object key, Class<T> type) {
            T value = delegate.get(key, type);
            if (value != null) {
                RequestTimings.markCacheHit();
            }
            return value;
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T get(Object key, Callable<T> valueLoader) {
            ValueWrapper cached = hit(delegate.get(key));
            return cached != null ? (T) cached.get() : delegate.get(key, valueLoader);
        }

        @Override
        public void put(Object key, Object value) {
            delegate.put(key, value);
        }

        @Override
        public void evict(Object key) {
            delegate.evict(key);
        }

        @Override
        public void clear() {
            delegate.clear();
        }

        private static ValueWrapper hit(ValueWrapper wrapper) {
            if (wrapper != null) {
                RequestTimings.markCacheHit();
            }
            return wrapper;
        }
    }
}
