package pl.mpospieszynski.site.contact.domain;

import java.util.UUID;

/** Published when a contact message has been stored; mail is sent once the transaction commits. */
public record ContactMessageReceived(UUID id) {
}
