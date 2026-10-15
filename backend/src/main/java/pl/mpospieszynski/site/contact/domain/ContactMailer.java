package pl.mpospieszynski.site.contact.domain;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import pl.mpospieszynski.site.contact.infra.ContactStore;
import pl.mpospieszynski.site.contact.infra.ContactStore.StoredMessage;

/**
 * After a message is stored: a notification to the owner (in Polish, with every field and a link to the admin)
 * and an auto-reply in the visitor's language from the settings (`{name}` is replaced). Plain-text mail; each
 * send is tried three times. A failure is logged only: the message is already in the admin inbox.
 */
@Component
public class ContactMailer {

    private static final Logger log = LoggerFactory.getLogger(ContactMailer.class);
    private static final int ATTEMPTS = 3;
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of("Europe/Warsaw"));

    /** Absent when no SMTP server is configured (e.g. tests that don't need mail). */
    private final ObjectProvider<JavaMailSender> mail;
    private final ContactStore store;
    private final ContactProperties properties;

    ContactMailer(ObjectProvider<JavaMailSender> mail, ContactStore store, ContactProperties properties) {
        this.mail = mail;
        this.store = store;
        this.properties = properties;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onReceived(ContactMessageReceived event) {
        store.find(event.id()).ifPresent(message -> {
            send(ownerNotification(message), "owner notification", message);
            store.autoReply(message.locale()).ifPresent(reply -> send(autoReply(message, reply), "auto-reply", message));
        });
    }

    /**
     * Admin settings: sends the saved auto-reply in `locale` to the owner's address, built by the same code as
     * the real one, with `{name}` replaced by `name`. False when no auto-reply is saved or no mail server is set.
     */
    public boolean sendTestAutoReply(String locale, String name) {
        JavaMailSender sender = mail.getIfAvailable();
        return sender != null && store.autoReply(locale).map(reply -> {
            sender.send(autoReply(properties.ownerTo(), name, reply));
            return true;
        }).orElse(false);
    }

    private SimpleMailMessage ownerNotification(StoredMessage m) {
        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setFrom(properties.from());
        mailMessage.setTo(properties.ownerTo());
        mailMessage.setReplyTo(m.email());
        mailMessage.setSubject("Nowa wiadomość: " + m.name() + " (" + m.topic() + ")");
        mailMessage.setText(String.join("\n",
                "Temat: " + m.topic(),
                "Imię i nazwisko: " + m.name(),
                "E-mail: " + m.email(),
                "Firma: " + orDash(m.company()),
                "Usługa: " + orDash(m.serviceTitle()),
                "Budżet: " + orDash(m.budgetRange()),
                "Termin: " + orDash(m.timeline()),
                "Język: " + m.locale(),
                "Wysłano: " + WHEN.format(m.createdAt()),
                "",
                m.message(),
                "",
                "W panelu: " + properties.adminBaseUrl() + "/admin/wiadomosci/" + m.id()));
        return mailMessage;
    }

    private SimpleMailMessage autoReply(StoredMessage m, ContactStore.AutoReply reply) {
        return autoReply(m.email(), m.name(), reply);
    }

    private SimpleMailMessage autoReply(String to, String name, ContactStore.AutoReply reply) {
        SimpleMailMessage mailMessage = new SimpleMailMessage();
        mailMessage.setFrom(properties.from());
        mailMessage.setTo(to);
        mailMessage.setSubject(reply.subject());
        mailMessage.setText(reply.bodyMd().replace("{name}", name));
        return mailMessage;
    }

    private void send(SimpleMailMessage message, String what, StoredMessage stored) {
        JavaMailSender sender = mail.getIfAvailable();
        if (sender == null) {
            log.warn("No mail server configured; the {} for contact message {} was not sent", what, stored.id());
            return;
        }
        for (int attempt = 1; attempt <= ATTEMPTS; attempt++) {
            try {
                sender.send(message);
                return;
            } catch (MailException e) {
                if (attempt == ATTEMPTS) {
                    log.error("Could not send the {} for contact message {}: {}", what, stored.id(), e.getMessage());
                    return;
                }
                sleep(attempt * 2_000L);
            }
        }
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String orDash(String value) {
        return value == null || value.isBlank() ? "–" : value;
    }
}
