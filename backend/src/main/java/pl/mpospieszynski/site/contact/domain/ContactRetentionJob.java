package pl.mpospieszynski.site.contact.domain;

import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pl.mpospieszynski.site.contact.infra.ContactStore;

/** Deletes contact messages older than the retention period stated in the privacy policy (default 12 months). */
@Component
class ContactRetentionJob {

    private static final Logger log = LoggerFactory.getLogger(ContactRetentionJob.class);

    private final ContactStore store;
    private final ContactProperties properties;

    ContactRetentionJob(ContactStore store, ContactProperties properties) {
        this.store = store;
        this.properties = properties;
    }

    @Scheduled(cron = "0 30 3 * * *", zone = "Europe/Warsaw")
    void deleteExpired() {
        int deleted = store.deleteOlderThan(OffsetDateTime.now().minus(properties.retention()));
        if (deleted > 0) {
            log.info("Deleted {} contact messages older than {}", deleted, properties.retention());
        }
    }
}
