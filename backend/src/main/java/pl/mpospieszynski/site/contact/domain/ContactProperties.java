package pl.mpospieszynski.site.contact.domain;

import java.time.Period;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * `site.contact.*`: who gets notified, the sender address, how long messages are kept and how many a visitor
 * may send per hour (docs/screens/public/08-contact.md).
 */
@ConfigurationProperties("site.contact")
public record ContactProperties(String ownerTo, String from, String adminBaseUrl, Period retention, int perHour) {

    public ContactProperties {
        retention = retention == null ? Period.ofMonths(12) : retention;
        perHour = perHour <= 0 ? 5 : perHour;
    }
}
