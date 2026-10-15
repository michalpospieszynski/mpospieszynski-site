package pl.mpospieszynski.site.contact.domain;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Mail after commit runs asynchronously; the retention job is scheduled. */
@Configuration
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties(ContactProperties.class)
class ContactConfig {
}
